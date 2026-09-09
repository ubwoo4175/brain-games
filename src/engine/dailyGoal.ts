import type { SessionRecord } from '../data/types'
import { todayKey } from '../shared/format'
import { DOMAIN_LABEL, type CognitiveDomain } from './types'

/**
 * 오늘의 목표 — 매일 하나씩, 날짜만 정해지면 똑같이 나오는 순수 로직.
 * 고령자 대상이라 "조금만 더 하면 되는" 수준으로만 잡습니다 (좌절 방지).
 */
export type DailyGoal =
  /** 서로 다른 게임 N가지 하기 */
  | { kind: 'games'; target: number }
  /** 특정 영역(기억력 등) 게임 한 판 하기 */
  | { kind: 'domain'; domain: CognitiveDomain; target: 1 }
  /** 오늘 합계 N점 모으기 */
  | { kind: 'points'; target: number }
  /** 한 판에서 정확도 N% 넘기기 */
  | { kind: 'accuracy'; target: number }

export interface GoalProgress {
  goal: DailyGoal
  /** "게임 3가지 하기" */
  title: string
  /** "2 / 3가지" */
  detail: string
  /** 0~1 */
  ratio: number
  done: boolean
}

/** 날짜 문자열 → 안정적인 정수 시드 */
function seedOf(dateKey: string): number {
  let h = 0
  for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

const sameDay = (s: SessionRecord, dateKey: string) => s.startedAt.slice(0, 10) === dateKey

/** 하루 총점 목록 (최근 것부터) — 점수 목표를 사람 수준에 맞추는 데 씀 */
function dailyPointTotals(history: SessionRecord[]): number[] {
  const byDay = new Map<string, number>()
  for (const s of history) byDay.set(s.startedAt.slice(0, 10), (byDay.get(s.startedAt.slice(0, 10)) ?? 0) + s.points)
  return [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([, v]) => v)
}

/** 최근 기록에서 가장 안 한 영역 (같으면 목록 순서가 빠른 쪽) */
function leastPlayedDomain(history: SessionRecord[], domainOf: Map<string, CognitiveDomain>, domains: CognitiveDomain[]): CognitiveDomain {
  const count = new Map<CognitiveDomain, number>(domains.map((d) => [d, 0]))
  for (const s of history.slice(0, 60)) {
    const d = domainOf.get(s.gameId)
    if (d !== undefined && count.has(d)) count.set(d, (count.get(d) ?? 0) + 1)
  }
  let best = domains[0]
  for (const d of domains) if ((count.get(d) ?? 0) < (count.get(best) ?? 0)) best = d
  return best
}

/**
 * 오늘의 목표 정하기.
 * @param history 전체 세션 기록 (최신순)
 * @param games   등록된 게임의 id·영역 (셸에서 넘겨줌 — 엔진이 games 층을 직접 알지 않도록)
 */
export function makeDailyGoal(
  dateKey: string,
  history: SessionRecord[],
  games: { id: string; domain: CognitiveDomain }[],
): DailyGoal {
  const past = history.filter((s) => s.startedAt.slice(0, 10) < dateKey)
  const playedDays = new Set(past.map((s) => s.startedAt.slice(0, 10))).size

  // 처음 며칠은 무조건 가장 쉬운 목표로 (부담 없이 습관 붙이기)
  if (playedDays < 3) return { kind: 'games', target: 2 }

  const totals = dailyPointTotals(past)
  const recent = totals.slice(0, 7)
  const typical = recent.length ? [...recent].sort((a, b) => a - b)[Math.floor(recent.length / 2)] : 0
  // 평소보다 조금 낮게 잡아 대부분 달성되게 (50점 단위, 100~800점)
  const pointTarget = Math.min(800, Math.max(100, Math.round((typical * 0.9) / 50) * 50))

  const domainOf = new Map(games.map((g) => [g.id, g.domain]))
  const domains = [...new Set(games.map((g) => g.domain))]

  const pick = seedOf(dateKey) % 4
  switch (pick) {
    case 0:
      return { kind: 'games', target: playedDays >= 10 ? 3 : 2 }
    case 1:
      return { kind: 'domain', domain: leastPlayedDomain(past, domainOf, domains), target: 1 }
    case 2:
      return { kind: 'points', target: pointTarget }
    default:
      return { kind: 'accuracy', target: 70 }
  }
}

/** 오늘 기록으로 목표 진행률 계산 */
export function evaluateGoal(
  goal: DailyGoal,
  history: SessionRecord[],
  games: { id: string; domain: CognitiveDomain }[],
  dateKey: string = todayKey(),
): GoalProgress {
  const today = history.filter((s) => sameDay(s, dateKey))
  const clamp = (v: number) => Math.max(0, Math.min(1, v))

  switch (goal.kind) {
    case 'games': {
      const current = new Set(today.map((s) => s.gameId)).size
      return {
        goal,
        title: `게임 ${goal.target}가지 해보기`,
        detail: `${Math.min(current, goal.target)} / ${goal.target}가지`,
        ratio: clamp(current / goal.target),
        done: current >= goal.target,
      }
    }
    case 'domain': {
      const domainOf = new Map(games.map((g) => [g.id, g.domain]))
      const done = today.some((s) => domainOf.get(s.gameId) === goal.domain)
      return {
        goal,
        title: `${DOMAIN_LABEL[goal.domain]} 게임 한 판 하기`,
        detail: done ? '완료!' : '아직이에요',
        ratio: done ? 1 : 0,
        done,
      }
    }
    case 'points': {
      const current = today.reduce((sum, s) => sum + s.points, 0)
      return {
        goal,
        title: `오늘 ${goal.target}점 모으기`,
        detail: `${current} / ${goal.target}점`,
        ratio: clamp(current / goal.target),
        done: current >= goal.target,
      }
    }
    default: {
      const best = today.reduce((m, s) => Math.max(m, s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0), 0)
      return {
        goal,
        title: `한 판에서 ${goal.target}% 맞히기`,
        detail: today.length === 0 ? '아직이에요' : `지금 제일 잘한 판 ${best}%`,
        ratio: clamp(best / goal.target),
        done: best >= goal.target,
      }
    }
  }
}
