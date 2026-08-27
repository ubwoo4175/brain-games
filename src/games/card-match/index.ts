import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeCardMatchRound } from './logic'
import { RoundView } from './RoundView'
import type { CardMatchRound } from './types'

/** 카드 짝 맞추기 — 시각 기억. 한 판 = 문제 하나, 실수가 적으면 정답으로 친다. */
export const cardMatch: GameDefinition<CardMatchRound> = {
  id: 'card-match',
  title: '카드 짝 맞추기',
  subtitle: '같은 그림 두 장을 찾아요',
  howTo: '뒤집힌 카드를 두 장씩 열어서 같은 그림을 찾아요. 처음에 잠깐 보여주니 잘 기억해 두세요.',
  icon: '🃏',
  domain: 'memory',
  color: '#ffe4e6',
  minLevel: 1,
  maxLevel: 5,
  defaultLevel: 1,
  levelLabel: (level) => `카드 ${(LEVELS[level] ?? LEVELS[1]).pairs * 2}장`,
  mode: { kind: 'rounds', count: 2 },
  adaptive: { upAfter: 2, downAfter: 1 },
  makeRound: (level, rng) => makeCardMatchRound(level, rng),
  RoundView,
}
