import type { RoundResult, SessionScore } from './types'

/** 정답 1개 = 10점 × 그 문제의 레벨. 모든 게임 공통. */
export function scoreSession(results: RoundResult[]): SessionScore {
  const total = results.length
  const correctResults = results.filter((r) => r.correct)
  const correct = correctResults.length
  const points = correctResults.reduce((sum, r) => sum + 10 * r.level, 0)
  const avgResponseMs = total ? results.reduce((s, r) => s + r.responseMs, 0) / total : 0
  return { correct, total, accuracy: total ? correct / total : 0, points, avgResponseMs }
}
