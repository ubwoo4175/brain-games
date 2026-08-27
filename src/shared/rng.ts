/**
 * 시드 가능한 난수 생성기 (mulberry32).
 * 게임의 makeRound()는 반드시 이 Rng만 사용해야 합니다.
 * → 같은 시드면 같은 문제가 나오므로 테스트/재현이 쉽고,
 *   나중에 "오늘의 문제"처럼 모든 사용자에게 같은 문제를 낼 수도 있습니다.
 */
export interface Rng {
  /** [0, 1) 실수 */
  next(): number
  /** [min, max] 정수 (양 끝 포함) */
  int(min: number, max: number): number
  /** 배열에서 하나 고르기 */
  pick<T>(arr: readonly T[]): T
  /** 배열 섞기 (새 배열 반환) */
  shuffle<T>(arr: readonly T[]): T[]
  /** 확률 p로 true */
  chance(p: number): boolean
}

export function createRng(seed: number = Date.now()): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const out = [...arr]
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1))
        ;[out[i], out[j]] = [out[j], out[i]]
      }
      return out
    },
    chance: (p) => next() < p,
  }
}
