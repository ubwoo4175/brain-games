import type { Rng } from '../../shared/rng'
import type { QuickMathRound } from './types'

export const LEVEL_LABELS: Record<number, string> = {
  1: '한 자리 덧셈',
  2: '10 넘는 덧셈',
  3: '뺄셈 (20까지)',
  4: '두 자리 + 한 자리',
  5: '두 자리 − 한 자리',
  6: '두 자리 + 두 자리',
  7: '두 자리 − 두 자리',
  8: '구구단',
  9: '세 수 더하고 빼기',
  10: '모두 섞어서',
}

type Problem = { text: string; answer: number }

function add(rng: Rng, aMin: number, aMax: number, bMin: number, bMax: number): Problem {
  const a = rng.int(aMin, aMax)
  const b = rng.int(bMin, bMax)
  return { text: `${a} + ${b}`, answer: a + b }
}
function sub(rng: Rng, aMin: number, aMax: number, bMin: number, bMax: number): Problem {
  let a = rng.int(aMin, aMax)
  let b = rng.int(bMin, bMax)
  if (b > a) [a, b] = [b, a]
  return { text: `${a} − ${b}`, answer: a - b }
}
function mul(rng: Rng): Problem {
  const a = rng.int(2, 9)
  const b = rng.int(2, 9)
  return { text: `${a} × ${b}`, answer: a * b }
}
function triple(rng: Rng): Problem {
  const a = rng.int(5, 20)
  const b = rng.int(1, 9)
  const c = rng.int(1, 9)
  if (rng.chance(0.5)) return { text: `${a} + ${b} − ${c}`, answer: a + b - c }
  const big = Math.max(a, b + c)
  return { text: `${big} − ${b} + ${c}`, answer: big - b + c }
}

function problemForLevel(level: number, rng: Rng): Problem {
  switch (level) {
    case 1: {
      // 합이 10 이하
      const a = rng.int(1, 9)
      const b = rng.int(1, 10 - a)
      return { text: `${a} + ${b}`, answer: a + b }
    }
    case 2:
      return add(rng, 5, 9, 5, 9)
    case 3:
      return sub(rng, 5, 20, 1, 9)
    case 4:
      return add(rng, 10, 89, 2, 9)
    case 5:
      return sub(rng, 11, 99, 2, 9)
    case 6:
      return add(rng, 10, 59, 10, 39)
    case 7:
      return sub(rng, 20, 99, 10, 59)
    case 8:
      return mul(rng)
    case 9:
      return triple(rng)
    default:
      return problemForLevel(rng.int(4, 9), rng)
  }
}

/** 정답 근처의 그럴듯한 오답 3개 */
function makeChoices(answer: number, rng: Rng): number[] {
  const set = new Set<number>([answer])
  const deltas = [1, 2, 3, 10, -1, -2, -3, -10, 4, 5]
  let guard = 0
  while (set.size < 4 && guard++ < 50) {
    const d = rng.pick(deltas)
    const v = answer + d
    if (v >= 0) set.add(v)
  }
  while (set.size < 4) set.add(answer + set.size + 10)
  return rng.shuffle([...set])
}

export function makeQuickMathRound(level: number, rng: Rng): QuickMathRound {
  const p = problemForLevel(level, rng)
  return { text: p.text, answer: p.answer, choices: makeChoices(p.answer, rng) }
}
