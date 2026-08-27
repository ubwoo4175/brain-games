import type { GameDefinition } from '../../engine/types'
import { RoundView } from './RoundView'
import type { Hand, LosingRpsRound } from './types'

const HANDS: Hand[] = ['rock', 'scissors', 'paper']

/** 레벨별 제한시간(ms). 1~5: 지는 것만, 6~10: 지는 것/이기는 것 섞어서 */
const TIME_BY_LEVEL: Record<number, number> = {
  1: 5000,
  2: 4000,
  3: 3200,
  4: 2600,
  5: 2200,
  6: 3400,
  7: 2800,
  8: 2300,
  9: 1900,
  10: 1600,
}

/** 지는 가위바위보 — 억제조절(습관적 반응 참기) */
export const losingRps: GameDefinition<LosingRpsRound> = {
  id: 'losing-rps',
  title: '지는 가위바위보',
  subtitle: '이기지 말고, 져야 해요!',
  howTo: '화면에 손이 나오면, 그 손에게 "지는" 손을 골라주세요. 시간 안에 눌러야 해요.',
  icon: '✌️',
  domain: 'inhibition',
  color: '#fef3c7',
  minLevel: 1,
  maxLevel: 10,
  defaultLevel: 1,
  levelLabel: (level) => {
    const sec = (TIME_BY_LEVEL[level] / 1000).toFixed(1).replace('.0', '')
    return level <= 5 ? `지는 손 · ${sec}초 안에` : `지기/이기기 섞어서 · ${sec}초 안에`
  },
  mode: { kind: 'rounds', count: 12 },
  makeRound: (level, rng, { previous }) => {
    let shown = rng.pick(HANDS)
    // 같은 손이 연달아 나오면 재미가 떨어지므로 한 번 더 뽑기
    if (previous && previous.shown === shown) shown = rng.pick(HANDS)
    const rule = level >= 6 ? (rng.chance(0.5) ? 'lose' : 'win') : 'lose'
    return { shown, rule, timeLimitMs: TIME_BY_LEVEL[level] ?? 3000 }
  },
  RoundView,
}
