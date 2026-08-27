import type { GameDefinition } from '../../engine/types'
import { RoundView } from './RoundView'
import type { Hand, LosingRpsRound } from './types'

const HANDS: Hand[] = ['rock', 'scissors', 'paper']

/** 낮은 레벨의 고정 버튼 순서 (가위·바위·보) */
const FIXED_ORDER: Hand[] = ['scissors', 'rock', 'paper']

/** 이 레벨부터 선택 버튼 위치가 매 문제 섞인다 */
export const SHUFFLE_FROM_LEVEL = 4

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
    const rule = level <= 5 ? '지는 손' : '지기/이기기 섞어서'
    const shuffled = level >= SHUFFLE_FROM_LEVEL ? ' · 위치 섞임' : ''
    return `${rule} · ${sec}초 안에${shuffled}`
  },
  mode: { kind: 'rounds', count: 12 },
  makeRound: (level, rng, { previous }) => {
    let shown = rng.pick(HANDS)
    // 같은 손이 연달아 나오면 재미가 떨어지므로 한 번 더 뽑기
    if (previous && previous.shown === shown) shown = rng.pick(HANDS)
    const rule = level >= 6 ? (rng.chance(0.5) ? 'lose' : 'win') : 'lose'
    // 높은 레벨에선 버튼 위치도 매 문제 섞여서, 손에 익은 자리로 누르는 습관을 막는다
    const order = level >= SHUFFLE_FROM_LEVEL ? rng.shuffle(HANDS) : FIXED_ORDER
    return { shown, rule, timeLimitMs: TIME_BY_LEVEL[level] ?? 3000, order }
  },
  RoundView,
}
