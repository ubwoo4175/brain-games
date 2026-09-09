/**
 * Web Push 암호화 검증 (외부 의존성 없음)
 *   node --import tsx scripts/verify-webpush.mjs   또는   npx tsx scripts/verify-webpush.mjs
 *
 * 1) RFC 8291 §5 의 고정 입력(수신자 키·auth·salt·서버 키)으로 암호화 → 결정론적 결과가
 *    스냅샷과 같은지 (회귀 방지)
 * 2) 그 결과를 수신자 개인키로 실제 복호화해서 원문이 나오는지 (왕복 검증)
 *
 * 최초 작성 시 널리 쓰이는 독립 구현(npm `http_ece`)으로도 복호화가 되는 것을 확인했습니다
 * → 브라우저·푸시 서비스가 해석할 수 있는 규격임이 교차 검증되었습니다.
 */
import { encryptPayload, b64uToBytes, bytesToB64u, vapidAuthHeader } from '../supabase/functions/daily-reminder/webpush.ts'

const PLAINTEXT = 'When I grow up, I want to be a watermelon'
const UA_PUBLIC = 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4'
const UA_PRIVATE = 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94'
const AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg'
const SALT = 'DGv6ra1nlYgDCS1FRnbzlw'
const AS_PUBLIC = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const AS_PRIVATE_D = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw'
const SNAPSHOT =
  'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN'

const fail = (msg) => {
  console.error('❌ ' + msg)
  process.exit(1)
}
const asPub = b64uToBytes(AS_PUBLIC)
const jwkOf = (pub, d) => ({ kty: 'EC', crv: 'P-256', x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)), d, ext: true })

/* ---------- 1) 결정론적 스냅샷 ---------- */
const encrypted = await encryptPayload(PLAINTEXT, UA_PUBLIC, AUTH_SECRET, {
  salt: b64uToBytes(SALT),
  serverPrivateJwk: jwkOf(asPub, AS_PRIVATE_D),
  serverPublic: asPub,
})
const got = bytesToB64u(encrypted)
if (got !== SNAPSHOT) fail(`암호문이 스냅샷과 다릅니다.\n기대: ${SNAPSHOT}\n실제: ${got}`)
const expectedLen = 16 + 4 + 1 + 65 + PLAINTEXT.length + 1 + 16
if (encrypted.length !== expectedLen) fail(`길이가 ${encrypted.length}, 기대 ${expectedLen}`)
console.log(`✅ 결정론적 암호문 스냅샷 일치 (${encrypted.length}바이트)`)

/* ---------- 2) 왕복 검증: 수신자 개인키로 복호화 ---------- */
const concat = (...ps) => {
  const out = new Uint8Array(ps.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of ps) { out.set(p, o); o += p.length }
  return out
}
const utf8 = (s) => new TextEncoder().encode(s)
async function hkdf(salt, ikm, info, len) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, len * 8))
}

const salt = encrypted.slice(0, 16)
const idlen = encrypted[20]
const senderPublic = encrypted.slice(21, 21 + idlen)
const ciphertext = encrypted.slice(21 + idlen)

const uaPub = b64uToBytes(UA_PUBLIC)
const uaPrivate = await crypto.subtle.importKey('jwk', jwkOf(uaPub, UA_PRIVATE), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
const senderKey = await crypto.subtle.importKey('raw', senderPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: senderKey }, uaPrivate, 256))

const ikm = await hkdf(b64uToBytes(AUTH_SECRET), shared, concat(utf8('WebPush: info'), new Uint8Array([0]), uaPub, senderPublic), 32)
const cek = await hkdf(salt, ikm, concat(utf8('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16)
const nonce = await hkdf(salt, ikm, concat(utf8('Content-Encoding: nonce'), new Uint8Array([0])), 12)
const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])

let plain
try {
  plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, ciphertext))
} catch {
  fail('복호화 실패 (AES-GCM 인증 태그 불일치)')
}
if (plain[plain.length - 1] !== 2) fail('마지막 레코드 구분자(0x02)가 없습니다')
const text = new TextDecoder().decode(plain.slice(0, -1))
if (text !== PLAINTEXT) fail(`복호화 결과 불일치: ${JSON.stringify(text)}`)
console.log(`✅ 왕복 검증 통과 — 복호화 결과: ${JSON.stringify(text)}`)

/* ---------- 3) VAPID JWT 형식 ---------- */
const header = await vapidAuthHeader(
  'https://fcm.googleapis.com/fcm/send/abc',
  'mailto:test@example.com',
  'BGLMgEH-Y0HBPUyTSFS--5YTCh_DZWvedC7VFTbEcQeXIBknnZABNw-qo809IPw8Qyj-r6LT2g3SGLOXSbwzwoY',
  'K-JuuGSSVIECgi6XDOKWQTYvdfdvoNLMknn2CzudQzM',
  1_800_000_000,
)
const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header)
if (!m) fail('VAPID 헤더 형식 오류: ' + header)
const dec = (s) => JSON.parse(new TextDecoder().decode(b64uToBytes(s)))
const h = dec(m[1]), p = dec(m[2]), sigLen = b64uToBytes(m[3]).length
if (h.alg !== 'ES256' || h.typ !== 'JWT') fail('JWT 헤더 오류: ' + JSON.stringify(h))
if (p.aud !== 'https://fcm.googleapis.com') fail('aud 오류: ' + p.aud)
if (p.exp !== 1_800_000_000 + 12 * 3600) fail('exp 오류: ' + p.exp)
if (sigLen !== 64) fail('ES256 서명은 64바이트여야 합니다: ' + sigLen)
console.log('✅ VAPID JWT 정상 (ES256, aud=' + p.aud + ', 서명 64바이트)')
console.log('\n🎉 Web Push 구현 검증 완료')
