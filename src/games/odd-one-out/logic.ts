import type { Rng } from '../../shared/rng'
import type { OddOneOutRound } from './types'

/** [깔리는 것, 하나만 다른 것]. 뒤로 갈수록 미묘해진다. */
const PAIRS_EASY: [string, string][] = [
  ['6', '9'],
  ['ㅁ', 'ㅇ'],
  ['개', '새'],
  ['자', '차'],
  ['3', '7'],
  ['달', '별'],
]
const PAIRS_MID: [string, string][] = [
  ['금', '급'],
  ['눈', '문'],
  ['해', '헤'],
  ['소', '수'],
  ['왕', '앙'],
  ['바', '비'],
]
const PAIRS_HARD: [string, string][] = [
  ['입', '임'],
  ['글', '굴'],
  ['처', '저'],
  ['북', '묵'],
  ['손', '솔'],
  ['86', '68'],
]

interface LevelConfig {
  pairs: [string, string][]
  cols: number
  rows: number
  label: string
}

export const LEVELS: Record<number, LevelConfig> = {
  1: { pairs: PAIRS_EASY, cols: 3, rows: 3, label: '쉬움 · 9칸' },
  2: { pairs: PAIRS_EASY, cols: 3, rows: 4, label: '쉬움 · 12칸' },
  3: { pairs: PAIRS_MID, cols: 3, rows: 4, label: '비슷한 글자 · 12칸' },
  4: { pairs: PAIRS_MID, cols: 4, rows: 4, label: '비슷한 글자 · 16칸' },
  5: { pairs: PAIRS_HARD, cols: 4, rows: 4, label: '아주 비슷 · 16칸' },
  6: { pairs: PAIRS_HARD, cols: 4, rows: 5, label: '아주 비슷 · 20칸' },
}

export function makeOddOneOutRound(level: number, rng: Rng, previous?: OddOneOutRound): OddOneOutRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  let [base, odd] = rng.pick(cfg.pairs)
  // 직전 문제와 같은 짝은 피함
  if (previous && previous.base === base) [base, odd] = rng.pick(cfg.pairs)
  // 절반은 거꾸로 (깔린 것과 다른 것을 뒤집기)
  if (rng.chance(0.5)) [base, odd] = [odd, base]
  const count = cfg.cols * cfg.rows
  return { base, odd, oddIndex: rng.int(0, count - 1), count, cols: cfg.cols }
}
