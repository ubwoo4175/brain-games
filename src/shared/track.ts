/**
 * 이벤트 트래킹 훅.
 * 지금은 콘솔에만 남기지만, 나중에 분석 도구/광고 회상률 측정을 붙일 때
 * 이 파일의 sink만 교체하면 앱 전체 이벤트가 그리로 갑니다.
 *
 * 사용 예: track('session_end', { gameId, correct, total })
 */
export type TrackEvent =
  | 'app_open'
  | 'session_start'
  | 'session_end'
  | 'round_answer'
  | 'level_change'
  | 'interstitial_shown'
  | 'ad_shown'
  | 'ad_recalled'
  | 'settings_change'

type Sink = (event: TrackEvent, props?: Record<string, unknown>) => void

const sinks: Sink[] = [
  (event, props) => {
    if (import.meta.env.DEV) console.debug('[track]', event, props ?? '')
  },
]

export function addTrackSink(sink: Sink) {
  sinks.push(sink)
}

export function track(event: TrackEvent, props?: Record<string, unknown>) {
  for (const s of sinks) {
    try {
      s(event, props)
    } catch {
      /* 트래킹 실패가 게임을 멈추면 안 됨 */
    }
  }
}
