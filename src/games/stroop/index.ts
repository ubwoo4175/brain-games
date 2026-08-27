import type { GameDefinition } from '../../engine/types'
import { LEVELS, makeStroopRound } from './logic'
import { RoundView } from './RoundView'
import type { StroopRound } from './types'

/** 색깔-글자 스트룹 — 주의력·억제조절. 글자의 뜻에 끌려가지 않고 색을 골라야 한다. */
export const stroop: GameDefinition<StroopRound> = {
  id: 'stroop',
  title: '색깔 고르기',
  subtitle: '글자에 속지 말고 색깔을 골라요',
  howTo: '색 이름이 다른 색으로 쓰여 있어요. 글자를 읽지 말고, 글자가 칠해진 색깔을 골라주세요.',
  icon: '🎨',
  domain: 'attention',
  color: '#e0e7ff',
  minLevel: 1,
  maxLevel: 7,
  defaultLevel: 1,
  levelLabel: (level) => LEVELS[level]?.label ?? `레벨 ${level}`,
  mode: { kind: 'timed', seconds: 30 },
  makeRound: (level, rng, { previous }) => makeStroopRound(level, rng, previous),
  RoundView,
}
