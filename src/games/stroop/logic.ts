import type { Rng } from '../../shared/rng'
import { COLOR_IDS, type StroopRound } from './types'

interface LevelConfig {
  /** 글자 뜻과 글자 색이 같은(쉬운) 문제 비율 */
  congruent: number
  /** '글자의 뜻'을 묻는 문제 비율 (나머지는 '글자의 색') */
  askWord: number
  label: string
}

export const LEVELS: Record<number, LevelConfig> = {
  1: { congruent: 1, askWord: 0, label: '색깔 고르기 연습' },
  2: { congruent: 0.5, askWord: 0, label: '색깔 고르기 · 함정 절반' },
  3: { congruent: 0.25, askWord: 0, label: '색깔 고르기 · 함정 많음' },
  4: { congruent: 0, askWord: 0, label: '색깔 고르기 · 전부 함정' },
  5: { congruent: 0.25, askWord: 0.3, label: '색깔/뜻 섞어서' },
  6: { congruent: 0.15, askWord: 0.5, label: '색깔/뜻 반반' },
  7: { congruent: 0, askWord: 0.5, label: '색깔/뜻 반반 · 전부 함정' },
}

export function makeStroopRound(level: number, rng: Rng, previous?: StroopRound): StroopRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  let word = rng.pick(COLOR_IDS)
  // 직전 문제와 같은 단어가 연달아 나오는 건 피함
  if (previous && previous.word === word) word = rng.pick(COLOR_IDS)
  const congruent = rng.chance(cfg.congruent)
  const ink = congruent ? word : rng.pick(COLOR_IDS.filter((c) => c !== word))
  const ask = rng.chance(cfg.askWord) ? 'word' : 'ink'
  return { word, ink, ask }
}
