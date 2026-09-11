/**
 * 홈의 "아무거나 하나 시작하기" 버튼이 고를 게임 정하기.
 *
 * 무작위지만 완전 무작위는 아닙니다 — 어머니가 같은 게임만 반복하지 않도록:
 *  1) 오늘 아직 안 한 게임을 먼저 고른다 (오늘의 목표에도 도움이 됨)
 *  2) 후보가 둘 이상이면 직전에 한 게임은 뺀다
 *  3) 남은 것 중에서 무작위
 *
 * 순수 함수입니다. 난수는 반드시 인자로 받은 random() 만 씁니다 (테스트 가능하도록).
 */
export function pickRandomGameId(
  gameIds: string[],
  opts: { doneToday?: readonly string[]; lastPlayedId?: string | null; random?: () => number } = {},
): string | null {
  if (gameIds.length === 0) return null

  const done = new Set(opts.doneToday ?? [])
  // 1) 오늘 안 한 게임 우선 (전부 했으면 전체에서 고른다)
  let pool = gameIds.filter((id) => !done.has(id))
  if (pool.length === 0) pool = [...gameIds]

  // 2) 직전 게임은 빼되, 그것밖에 없으면 그냥 둔다
  if (opts.lastPlayedId && pool.length > 1) {
    const without = pool.filter((id) => id !== opts.lastPlayedId)
    if (without.length > 0) pool = without
  }

  // 3) 무작위 한 개
  const random = opts.random ?? Math.random
  const i = Math.min(pool.length - 1, Math.floor(random() * pool.length))
  return pool[i]
}
