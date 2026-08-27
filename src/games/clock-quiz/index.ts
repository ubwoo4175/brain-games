import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeClockRound } from './logic'
import { RoundView } from './RoundView'
import type { ClockRound } from './types'

/** 시계 읽기 — 시공간·지남력. 치매 선별검사의 시계 항목을 탭만으로 풀 수 있게 바꾼 것. */
export const clockQuiz: GameDefinition<ClockRound> = {
  id: 'clock-quiz',
  title: '시계 읽기',
  subtitle: '바늘이 가리키는 시각 맞히기',
  howTo: '시계 바늘을 보고 몇 시 몇 분인지 골라주세요. 짧은 바늘이 시, 긴 바늘이 분이에요.',
  icon: '🕒',
  domain: 'visuospatial',
  color: '#f5f5f4',
  minLevel: 1,
  maxLevel: 5,
  defaultLevel: 1,
  levelLabel: (level) => LEVELS[level]?.label ?? `레벨 ${level}`,
  mode: { kind: 'rounds', count: 6 },
  makeRound: (level, rng, { previous }) => makeClockRound(level, rng, previous),
  RoundView,
}
