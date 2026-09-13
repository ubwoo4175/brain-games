import type { SessionRecord } from '../data/types'
import { todayKey } from '../shared/format'

/**
 * 최근 7일 일별 집계 — 기록 화면의 주간 그래프용.
 * 순수 함수. 오늘을 맨 오른쪽에 두고 왼쪽으로 6일 더.
 */

export interface WeekDay {
  /** YYYY-MM-DD */
  key: string
  /** 요일 한 글자 (일~토) */
  label: string
  /** 그날 모은 점수 합계 */
  points: number
  /** 그날 한 판 수 */
  plays: number
  isToday: boolean
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export function buildWeekly(sessions: readonly SessionRecord[], today: string = todayKey()): WeekDay[] {
  const byDay = new Map<string, { points: number; plays: number }>()
  for (const s of sessions) {
    const day = s.startedAt.slice(0, 10)
    const cur = byDay.get(day) ?? { points: 0, plays: 0 }
    cur.points += s.points
    cur.plays += 1
    byDay.set(day, cur)
  }

  const base = new Date(today + 'T00:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(d.getDate() - (6 - i))
    const key = todayKey(d)
    const agg = byDay.get(key) ?? { points: 0, plays: 0 }
    return { key, label: DAY_LABELS[d.getDay()], points: agg.points, plays: agg.plays, isToday: key === today }
  })
}

/** 그래프 세로 기준값. 전부 0이면 1을 돌려줘 0으로 나누는 일이 없게 한다. */
export function weeklyMax(week: readonly WeekDay[]): number {
  return Math.max(1, ...week.map((d) => d.points))
}

/** 화면에 읽어줄 한 줄 요약 (스크린리더용 + 그래프 아래 설명) */
export function weeklySummary(week: readonly WeekDay[]): string {
  const activeDays = week.filter((d) => d.plays > 0).length
  const total = week.reduce((n, d) => n + d.points, 0)
  if (activeDays === 0) return '최근 7일 동안은 아직 기록이 없어요'
  return `최근 7일 중 ${activeDays}일 운동 · 모두 ${total.toLocaleString('ko-KR')}점`
}
