import type { Rng } from '../../shared/rng'
import type { SimonPad, SimonRound } from './types'

/** 레벨 = 순서 길이. 같은 버튼이 세 번 연달아 나오는 것만 피한다. */
export function makeSimonRound(level: number, rng: Rng): SimonRound {
  const seq: SimonPad[] = []
  while (seq.length < level) {
    const p = rng.int(0, 3) as SimonPad
    const len = seq.length
    if (len >= 2 && seq[len - 1] === p && seq[len - 2] === p) continue
    seq.push(p)
  }
  return { seq }
}
