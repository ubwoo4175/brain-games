import type { GameDefinition } from '../../engine/types'
import { RoundView } from './RoundView'
import type { DigitSpanRound } from './types'

export const digitSpan: GameDefinition<DigitSpanRound> = {
  id: 'digit-span',
  title: '거꾸로 숫자',
  subtitle: '숫자를 보고 거꾸로 입력해요',
  howTo: '숫자가 하나씩 나타났다 사라져요. 다 보고 나서, 본 순서와 반대로 눌러주세요.',
  icon: '🔢',
  domain: 'memory',
  color: '#dbeafe',
  minLevel: 3,
  maxLevel: 9,
  defaultLevel: 3,
  levelLabel: (level) => `숫자 ${level}개`,
  mode: { kind: 'rounds', count: 6 },
  adaptive: { upAfter: 2, downAfter: 2 },
  makeRound: (level, rng) => {
    const digits: number[] = []
    while (digits.length < level) {
      const d = rng.int(0, 9)
      // 바로 앞 숫자와 같은 숫자는 피함 (헷갈림 방지)
      if (digits.length && digits[digits.length - 1] === d) continue
      digits.push(d)
    }
    return { digits }
  },
  RoundView,
}
