import { useEffect, useState } from 'react'
import { pickContent } from '../../content'
import type { SessionRecord } from '../../data'
import { DOMAIN_LABEL } from '../../engine/types'
import { GAMES } from '../../games'
import { daysBetween, formatKoreanDate, todayKey } from '../../shared/format'
import { BigButton, Card } from '../../ui'
import { useApp } from '../AppContext'
import type { Route } from '../router'

/** 세션 기록에서 연속 출석일 계산 */
function computeStreak(sessions: SessionRecord[]): { streak: number; playedToday: boolean } {
  const days = new Set(sessions.map((s) => s.startedAt.slice(0, 10)))
  const today = todayKey()
  const playedToday = days.has(today)
  let streak = 0
  // 오늘 안 했으면 어제부터 센다 (오늘 하면 이어지도록)
  let cursor = playedToday ? today : todayKey(new Date(Date.now() - 86400000))
  while (days.has(cursor)) {
    streak += 1
    const d = new Date(cursor + 'T00:00:00')
    d.setDate(d.getDate() - 1)
    cursor = todayKey(d)
  }
  return { streak, playedToday }
}

export function HomeScreen({ navigate }: { navigate: (r: Route) => void }) {
  const { user, storage, levels } = useApp()
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  useEffect(() => {
    void storage.listSessions(user.userId, undefined, 500).then(setSessions)
  }, [storage, user.userId])

  const today = todayKey()
  const { streak, playedToday } = computeStreak(sessions)
  const doneToday = new Set(sessions.filter((s) => s.startedAt.startsWith(today)).map((s) => s.gameId))
  const content = pickContent(today)
  const lastPlayed = sessions[0] ? daysBetween(sessions[0].startedAt.slice(0, 10), today) : null

  return (
    <div className="stage">
      <div className="stage__body">
        <header className="home__header">
          <h1 className="home__title">오늘의 두뇌운동</h1>
          <p className="home__date">{formatKoreanDate()}</p>
        </header>

        <Card className="home__streak">
          <span className="home__streak-icon">{playedToday ? '🔥' : '🌱'}</span>
          <div>
            <div className="home__streak-main">
              {streak > 0 ? `${streak}일 연속 운동 중!` : lastPlayed === null ? '처음 오셨네요, 환영해요!' : '오늘도 시작해볼까요?'}
            </div>
            <div className="home__streak-sub">
              {playedToday
                ? `오늘 ${doneToday.size}가지 게임 완료 · ${GAMES.length - doneToday.size > 0 ? `${GAMES.length - doneToday.size}가지 남았어요` : '전부 다 하셨어요!'}`
                : streak > 0
                  ? '오늘 하면 기록이 이어져요'
                  : '아무거나 하나 골라서 시작해보세요'}
            </div>
          </div>
        </Card>

        <div className="home__games">
          {GAMES.map((g) => (
            <button
              key={g.id}
              type="button"
              className="game-card"
              style={{ background: g.color }}
              onClick={() => navigate({ name: 'game', gameId: g.id })}
            >
              <span className="game-card__top">
                <span className="game-card__icon" aria-hidden>
                  {g.icon}
                </span>
                <span className="game-card__title">{g.title}</span>
                <span className="tag">{DOMAIN_LABEL[g.domain]}</span>
              </span>
              <span className="game-card__sub">{g.subtitle}</span>
              <span className="game-card__meta">
                <span>레벨 {levels[g.id] ?? g.defaultLevel}</span>
                {doneToday.has(g.id) ? <span className="tag tag--done">오늘 완료 ✓</span> : <span>{g.mode.kind === 'rounds' ? `문제 ${g.mode.count}개` : `${g.mode.seconds}초`}</span>}
              </span>
            </button>
          ))}
        </div>

        <div className="home__actions">
          <BigButton variant="secondary" onClick={() => navigate({ name: 'stats' })}>
            📈 기록 보기
          </BigButton>
          <BigButton variant="secondary" onClick={() => navigate({ name: 'settings' })}>
            ⚙️ 설정
          </BigButton>
        </div>

        {content && (
          <Card className="content-card">
            <span aria-hidden>💬</span>
            <span>{content.body}</span>
          </Card>
        )}
      </div>
    </div>
  )
}
