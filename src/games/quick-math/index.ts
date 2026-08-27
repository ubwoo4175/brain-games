import type { GameDefinition } from '../../engine/types'
import { LEVEL_LABELS, makeQuickMathRound } from './logic'
import { RoundView } from './RoundView'
import type { QuickMathRound } from './types'

/** 빠른 암산 — 계산력·처리속도 (1분 타임어택) */
export const quickMath: GameDefinition<QuickMathRound> = {
  id: 'quick-math',
  title: '빠른 암산',
  subtitle: '1분 동안 몇 문제나 풀까요?',
  howTo: '계산 문제가 계속 나와요. 1분 동안 정답을 골라 최대한 많이 맞혀보세요.',
  icon: '➕',
  domain: 'calculation',
  color: '#dcfce7',
  minLevel: 1,
  maxLevel: 10,
  defaultLevel: 1,
  levelLabel: (level) => LEVEL_LABELS[level] ?? `레벨 ${level}`,
  mode: { kind: 'timed', seconds: 60 },
  makeRound: (level, rng) => makeQuickMathRound(level, rng),
  RoundView,
}
