import type { GameDefinition } from '../../engine/types'
import { makeSimonRound } from './logic'
import { RoundView } from './RoundView'
import type { SimonRound } from './types'

/** 순서 기억 (사이먼) — 계열 기억·주의력. 레벨 = 순서 길이. */
export const simon: GameDefinition<SimonRound> = {
  id: 'simon',
  title: '순서 기억',
  subtitle: '불 켜진 순서를 따라 눌러요',
  howTo: '색 버튼이 순서대로 불이 켜져요. 다 보고 나서 같은 순서로 눌러주세요.',
  icon: '🚦',
  domain: 'memory',
  color: '#fef9c3',
  minLevel: 2,
  maxLevel: 8,
  defaultLevel: 2,
  levelLabel: (level) => `${level}개 순서`,
  mode: { kind: 'rounds', count: 5 },
  adaptive: { upAfter: 2, downAfter: 2 },
  makeRound: (level, rng) => makeSimonRound(level, rng),
  RoundView,
}
