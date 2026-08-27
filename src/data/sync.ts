import type { GameSettings, SessionRecord } from './types'

/**
 * 로컬 ↔ 서버 병합 규칙 (순수 함수 — 테스트 대상).
 * - 세션 기록: id 로 합집합 (같은 판이 두 번 저장되지 않음), 최신순 정렬.
 * - 게임 설정(레벨): updatedAt 이 더 최신인 쪽이 이김.
 */

export const MAX_MERGED_SESSIONS = 2000

export function mergeSessions(a: SessionRecord[], b: SessionRecord[]): SessionRecord[] {
  const byId = new Map<string, SessionRecord>()
  for (const s of [...a, ...b]) if (!byId.has(s.id)) byId.set(s.id, s)
  const merged = [...byId.values()].sort((x, y) => (x.startedAt < y.startedAt ? 1 : -1))
  if (merged.length > MAX_MERGED_SESSIONS) merged.length = MAX_MERGED_SESSIONS
  return merged
}

export function pickNewerGameSettings(a: GameSettings | null, b: GameSettings | null): GameSettings | null {
  if (!a) return b
  if (!b) return a
  return a.updatedAt >= b.updatedAt ? a : b
}
