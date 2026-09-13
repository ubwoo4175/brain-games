import type { SessionRecord } from '../data/types'

/**
 * "지난번의 나"와 비교하기 — 결과 화면에 한 줄로 보여줄 문구를 만든다.
 *
 * 순위표 대신 자기 자신과 겨루게 하는 장치입니다. 지는 사람이 안 생기고,
 * 서버도 친구도 필요 없이 이미 쌓인 기록만으로 됩니다.
 *
 * 말투 규칙: 내려갔을 때도 나무라지 않는다. 사실은 그대로 말하되 계속할 이유를 준다.
 * 순수 함수 — 테스트 가능하도록 현재 시각도 인자로 받는다.
 */

export type CompareTone = 'up' | 'same' | 'down' | 'none'

export interface Comparison {
  tone: CompareTone
  /** 직전 판과 비교 (tone==='none' 이면 빈 문자열) */
  text: string
  /** 최근 7일 평균과 비교. 기록이 적으면 없음. */
  detail?: string
}

/** 최근 7일 평균을 말하려면 이만큼은 쌓여 있어야 한다 (한두 판으로 "평균"이라고 하면 어색함) */
const MIN_FOR_WEEKLY = 3
/** 평균과 이 정도 차이는 "비슷하다"고 본다 */
const SIMILAR_RATIO = 0.1

const DAY_MS = 86400000

export interface CurrentRun {
  points: number
  correct: number
  total: number
}

/**
 * @param current  방금 끝낸 판
 * @param past     같은 게임의 이전 기록 (최신순, 현재 판은 빼고)
 * @param now      현재 시각 (최근 7일 계산용)
 */
export function compareWithPast(current: CurrentRun, past: readonly SessionRecord[], now: number = Date.now()): Comparison {
  if (past.length === 0) return { tone: 'none', text: '' }

  const prev = past[0]

  // 문제 수가 같은 판끼리는 "몇 문제 더"가 훨씬 와닿는다.
  // 시간제 게임은 판마다 문제 수가 달라지므로 점수로 비교한다.
  const byCorrect = prev.total === current.total && current.total > 0
  const diff = byCorrect ? current.correct - prev.correct : current.points - prev.points
  const unit = byCorrect ? '문제' : '점'

  let tone: CompareTone
  let text: string
  if (diff > 0) {
    tone = 'up'
    text = byCorrect ? `지난번보다 ${diff}문제 더 맞히셨어요!` : `지난번보다 ${diff}점 올랐어요!`
  } else if (diff === 0) {
    tone = 'same'
    text = '지난번과 똑같아요. 꾸준하시네요!'
  } else {
    // 사실은 그대로 말하되 짧게. 격려는 결과 화면 맨 위 문구("수고하셨어요!")가 맡는다.
    // 길어지면 두 줄로 넘어가 폴드 화면에서 버튼이 밀린다.
    tone = 'down'
    text = `지난번보다 ${Math.abs(diff)}${unit} 적었어요`
  }

  return { tone, text, detail: weeklyDetail(current.points, past, now) }
}

/** 최근 7일 평균 점수와 비교한 한 줄 (기록이 적으면 undefined) */
function weeklyDetail(points: number, past: readonly SessionRecord[], now: number): string | undefined {
  const since = now - 7 * DAY_MS
  const recent = past.filter((s) => {
    const t = Date.parse(s.startedAt)
    return Number.isFinite(t) && t >= since
  })
  if (recent.length < MIN_FOR_WEEKLY) return undefined

  const avg = Math.round(recent.reduce((n, s) => n + s.points, 0) / recent.length)
  if (avg <= 0) return undefined

  const ratio = (points - avg) / avg
  if (ratio > SIMILAR_RATIO) return `최근 7일 평균 ${avg}점보다 높아요 👍`
  if (ratio < -SIMILAR_RATIO) return `최근 7일 평균은 ${avg}점이에요`
  return `최근 7일 평균 ${avg}점과 비슷해요`
}
