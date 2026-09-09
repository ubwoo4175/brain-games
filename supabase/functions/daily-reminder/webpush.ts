/**
 * Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) — 외부 의존성 없이 Web Crypto 만 사용.
 * Deno(Edge Function)와 Node 22 양쪽에서 그대로 돌아가므로, 배포 전에 로컬에서
 * RFC 8291 §5 테스트 벡터로 검증할 수 있습니다 (scripts/verify-webpush.mjs).
 */

export const b64uToBytes = (s: string): Uint8Array =>
  Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0))

export const bytesToB64u = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const concat = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

const utf8 = (s: string) => new TextEncoder().encode(s)

/** HKDF (extract + expand) — salt/ikm/info 로 length 바이트 도출 */
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8)
  return new Uint8Array(bits)
}

/** VAPID 공개키(65바이트 uncompressed point) → JWK */
function publicKeyToJwk(pub: Uint8Array) {
  return { kty: 'EC', crv: 'P-256', x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)), ext: true }
}

/**
 * 푸시 페이로드 암호화 (RFC 8291).
 * @param serverKeys 테스트용 고정 키. 실제로는 매번 새로 만든다.
 */
export async function encryptPayload(
  plaintext: string,
  p256dhB64u: string,
  authB64u: string,
  opts?: { salt?: Uint8Array; serverPrivateJwk?: JsonWebKey; serverPublic?: Uint8Array },
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(p256dhB64u)
  const authSecret = b64uToBytes(authB64u)
  const salt = opts?.salt ?? crypto.getRandomValues(new Uint8Array(16))

  // 서버(애플리케이션 서버) 임시 ECDH 키 쌍
  let asPrivate: CryptoKey
  let asPublic: Uint8Array
  if (opts?.serverPrivateJwk && opts.serverPublic) {
    asPrivate = await crypto.subtle.importKey('jwk', opts.serverPrivateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
    asPublic = opts.serverPublic
  } else {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
    asPrivate = pair.privateKey
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  }

  // 공유 비밀
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asPrivate, 256))

  // IKM ← auth_secret 을 salt 로 (RFC 8291 §3.4)
  const keyInfo = concat(utf8('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic)
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32)

  const cek = await hkdf(salt, ikm, concat(utf8('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
  const nonce = await hkdf(salt, ikm, concat(utf8('Content-Encoding: nonce'), new Uint8Array([0])), 12)

  // 본문: plaintext + 마지막 레코드 구분자(0x02)
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const body = concat(utf8(plaintext), new Uint8Array([2]))
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, body))

  // 헤더 (RFC 8188): salt(16) | rs(4) | idlen(1) | keyid(=서버 공개키 65)
  const rs = new Uint8Array(4)
  new DataView(rs.buffer).setUint32(0, 4096)
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext)
}

/** VAPID Authorization 헤더 (RFC 8292) */
export async function vapidAuthHeader(
  endpoint: string,
  subject: string,
  vapidPublicB64u: string,
  vapidPrivateB64u: string,
  now: number = Math.floor(Date.now() / 1000),
): Promise<string> {
  const aud = new URL(endpoint).origin
  const header = bytesToB64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payload = bytesToB64u(utf8(JSON.stringify({ aud, exp: now + 12 * 3600, sub: subject })))
  const signingInput = utf8(`${header}.${payload}`)

  const pub = b64uToBytes(vapidPublicB64u)
  const jwk = { ...publicKeyToJwk(pub), d: vapidPrivateB64u }
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signingInput))

  return `vapid t=${header}.${payload}.${bytesToB64u(sig)}, k=${vapidPublicB64u}`
}

export interface PushSubscriptionRow {
  endpoint: string
  p256dh: string
  auth: string
}

/** 푸시 한 건 전송. 구독이 만료(404/410)면 gone=true */
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: string,
  vapid: { publicKey: string; privateKey: string; subject: string },
): Promise<{ ok: boolean; status: number; gone: boolean; body?: string }> {
  const body = await encryptPayload(payload, sub.p256dh, sub.auth)
  const auth = await vapidAuthHeader(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey)
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
  })
  const gone = res.status === 404 || res.status === 410
  return { ok: res.ok, status: res.status, gone, body: res.ok ? undefined : await res.text().catch(() => '') }
}
