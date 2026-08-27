import type { Rng } from '../../shared/rng'
import type { CardMatchRound } from './types'

/** 친숙한 그림만: 과일·동물·꽃 */
export const CARD_POOL = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍊', '🐶', '🐱', '🐰', '🐢', '🦋', '🐤', '🌹', '🌻', '🌷', '🍁', '⭐', '🌙'] as const

interface LevelConfig {
  pairs: number
  cols: number
  previewMs: number
}

export const LEVELS: Record<number, LevelConfig> = {
  1: { pairs: 3, cols: 3, previewMs: 2000 },
  2: { pairs: 4, cols: 4, previewMs: 2000 },
  3: { pairs: 6, cols: 4, previewMs: 1500 },
  4: { pairs: 8, cols: 4, previewMs: 0 },
  5: { pairs: 10, cols: 4, previewMs: 0 },
}

/** 실수(짝이 아닌 뒤집기)가 이 이하면 그 판은 "정답"으로 친다 */
export function missAllowance(pairs: number): number {
  return pairs
}

export function makeCardMatchRound(level: number, rng: Rng): CardMatchRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  const symbols = rng.shuffle(CARD_POOL).slice(0, cfg.pairs)
  const cards = rng.shuffle([...symbols, ...symbols])
  return { cards, pairs: cfg.pairs, cols: cfg.cols, previewMs: cfg.previewMs }
}
