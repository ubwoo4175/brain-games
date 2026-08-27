import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeOddOneOutRound } from './logic'
import { RoundView } from './RoundView'
import type { OddOneOutRound } from './types'

/** 다른 것 하나 찾기 — 시각 주의·변별력. 30초 동안 몇 개 찾나. */
export const oddOneOut: GameDefinition<OddOneOutRound> = {
  id: 'odd-one-out',
  title: '다른 것 찾기',
  subtitle: '딱 하나만 달라요, 어디 있을까요?',
  howTo: '똑같은 글자들 사이에 다른 것이 딱 하나 있어요. 찾아서 눌러주세요.',
  icon: '🔍',
  domain: 'attention',
  color: '#d1fae5',
  minLevel: 1,
  maxLevel: 6,
  defaultLevel: 1,
  levelLabel: (level) => LEVELS[level]?.label ?? `레벨 ${level}`,
  mode: { kind: 'timed', seconds: 30 },
  makeRound: (level, rng, { previous }) => makeOddOneOutRound(level, rng, previous),
  RoundView,
}
