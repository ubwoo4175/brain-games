import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeNumberTouchRound } from './logic'
import { RoundView } from './RoundView'
import type { NumberTouchRound } from './types'

/** 숫자 순서대로 터치 — 처리속도·시각탐색. 빨리 끝낼수록 통계의 평균 반응시간이 좋아진다. */
export const numberTouch: GameDefinition<NumberTouchRound> = {
  id: 'number-touch',
  title: '숫자 순서 터치',
  subtitle: '1부터 순서대로 빨리 눌러요',
  howTo: '흩어진 숫자를 1부터 순서대로 눌러주세요. 빠르게 다 누르면 됩니다.',
  icon: '👆',
  domain: 'speed',
  color: '#cffafe',
  minLevel: 1,
  maxLevel: 7,
  defaultLevel: 1,
  levelLabel: (level) => `1부터 ${(LEVELS[level] ?? LEVELS[1]).n}까지`,
  mode: { kind: 'rounds', count: 3 },
  adaptive: { upAfter: 2, downAfter: 1 },
  makeRound: (level, rng) => makeNumberTouchRound(level, rng),
  RoundView,
}
