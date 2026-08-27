import type { AdaptiveRule } from './types'

export interface AdaptiveState {
  level: number
  correctStreak: number
  wrongStreak: number
}

/**
 * 한 문제 결과를 반영해 레벨을 조정.
 * 연속 정답 upAfter회 → +1, 연속 오답 downAfter회 → -1. 레벨이 바뀌면 연속 카운트 초기화.
 */
export function applyAdaptive(
  state: AdaptiveState,
  correct: boolean,
  rule: AdaptiveRule,
  minLevel: number,
  maxLevel: number,
): { state: AdaptiveState; changed: -1 | 0 | 1 } {
  let { level, correctStreak, wrongStreak } = state
  let changed: -1 | 0 | 1 = 0
  if (correct) {
    correctStreak += 1
    wrongStreak = 0
    if (correctStreak >= rule.upAfter && level < maxLevel) {
      level += 1
      changed = 1
      correctStreak = 0
    }
  } else {
    wrongStreak += 1
    correctStreak = 0
    if (wrongStreak >= rule.downAfter && level > minLevel) {
      level -= 1
      changed = -1
      wrongStreak = 0
    }
  }
  return { state: { level, correctStreak, wrongStreak }, changed }
}
