import type { Rng } from '../../shared/rng'
import type { NumberTouchRound } from './types'

interface LevelConfig {
  n: number
  cols: number
  rows: number
}

/** 숫자가 많아질수록 격자도 커져서 눈으로 찾는 범위가 넓어진다 */
export const LEVELS: Record<number, LevelConfig> = {
  1: { n: 5, cols: 3, rows: 3 },
  2: { n: 8, cols: 3, rows: 4 },
  3: { n: 10, cols: 4, rows: 4 },
  4: { n: 12, cols: 4, rows: 4 },
  5: { n: 15, cols: 4, rows: 5 },
  6: { n: 18, cols: 4, rows: 5 },
  7: { n: 20, cols: 4, rows: 5 },
}

/** 잘못 누른 횟수가 이 이하면 그 판은 정답 */
export const MISS_ALLOWANCE = 2

export function makeNumberTouchRound(level: number, rng: Rng): NumberTouchRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  const total = cfg.cols * cfg.rows
  const cells: (number | null)[] = Array.from({ length: total }, () => null)
  const positions = rng.shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, cfg.n)
  positions.forEach((pos, i) => {
    cells[pos] = i + 1
  })
  return { n: cfg.n, cells, cols: cfg.cols }
}
