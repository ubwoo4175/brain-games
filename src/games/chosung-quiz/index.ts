import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeChosungRound } from './logic'
import { RoundView } from './RoundView'
import type { ChosungRound } from './types'

/** 초성 퀴즈 — 언어력·의미기억 */
export const chosungQuiz: GameDefinition<ChosungRound> = {
  id: 'chosung-quiz',
  title: '초성 퀴즈',
  subtitle: 'ㅅㄱ → 사과! 무슨 단어일까요?',
  howTo: '자음(초성)만 보고 어떤 단어인지 맞혀보세요. 보기 중에서 고르면 돼요.',
  icon: '🔤',
  domain: 'language',
  color: '#fce7f3',
  minLevel: 1,
  maxLevel: 8,
  defaultLevel: 1,
  levelLabel: (level) => LEVELS[level]?.label ?? `레벨 ${level}`,
  mode: { kind: 'rounds', count: 10 },
  makeRound: (level, rng, { previous }) => makeChosungRound(level, rng, previous),
  RoundView,
}
