import type { Rng } from '../../shared/rng'
import { formatTime, type ClockRound, type ClockTime } from './types'

interface LevelConfig {
  /** 분침이 가리킬 수 있는 값들 */
  minutes: number[]
  /** 바늘을 뒤바꿔 읽은 시간(예: 3시 40분 → 8시 15분)을 함정 보기로 넣나 */
  swapTrap: boolean
  label: string
}

export const LEVELS: Record<number, LevelConfig> = {
  1: { minutes: [0], swapTrap: false, label: '몇 시 (정각)' },
  2: { minutes: [0, 30], swapTrap: false, label: '30분 단위' },
  3: { minutes: [0, 10, 20, 30, 40, 50], swapTrap: false, label: '10분 단위' },
  4: { minutes: [5, 10, 15, 20, 25, 35, 40, 45, 50, 55], swapTrap: false, label: '5분 단위' },
  5: { minutes: [5, 10, 15, 20, 25, 35, 40, 45, 50, 55], swapTrap: true, label: '5분 단위 · 함정 보기' },
}

const clampHour = (h: number) => ((h - 1 + 12) % 12) + 1

export function makeClockRound(level: number, rng: Rng, previous?: ClockRound): ClockRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  let time: ClockTime = { h: rng.int(1, 12), m: rng.pick(cfg.minutes) }
  if (previous && previous.time.h === time.h) time = { ...time, h: clampHour(time.h + rng.int(1, 11)) }
  const answer = formatTime(time)

  // 오답 보기: 시(h)만 다르게, 분(m)만 다르게, (높은 레벨) 바늘을 뒤바꿔 읽은 시간
  const candidates: ClockTime[] = [
    { h: clampHour(time.h + rng.pick([-1, 1])), m: time.m },
    { h: clampHour(time.h + rng.pick([-2, 2])), m: time.m },
    { h: time.h, m: rng.pick(cfg.minutes.filter((m) => m !== time.m)) ?? (time.m + 30) % 60 },
    { h: clampHour(time.h + rng.pick([-1, 1])), m: rng.pick(cfg.minutes) },
  ]
  if (cfg.swapTrap && time.m !== 0) {
    // 분침이 가리키는 숫자를 "시"로 잘못 읽는 흔한 실수
    const wrongHour = clampHour(Math.floor(time.m / 5) === 0 ? 12 : Math.floor(time.m / 5))
    candidates.unshift({ h: wrongHour, m: (time.h % 12) * 5 })
  }

  const choices = new Set<string>([answer])
  for (const c of candidates) {
    if (choices.size >= 4) break
    choices.add(formatTime(c))
  }
  // 혹시 겹쳐서 모자라면 시만 계속 옮겨가며 채움
  let extra = 3
  while (choices.size < 4) {
    choices.add(formatTime({ h: clampHour(time.h + extra), m: time.m }))
    extra += 1
  }

  return { time, answer, choices: rng.shuffle([...choices]) }
}
