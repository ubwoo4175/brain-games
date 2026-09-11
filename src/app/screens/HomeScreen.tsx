import { useEffect, useMemo, useState } from 'react'
import { pickContent } from '../../content'
import type { SessionRecord } from '../../data'
import { evaluateGoal, makeDailyGoal } from '../../engine/dailyGoal'
import { pickRandomGameId } from '../../engine/pickGame'
import { DOMAIN_LABEL } from '../../engine/types'
import { GAMES } from '../../games'
import { daysBetween, formatKoreanDate, todayKey } from '../../shared/format'
import { Avatar, BigButton, Card } from '../../ui'
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
  const { user, storage, profile, levels } = useApp()
  const [sessions, setSessions] = useState<SessionRecord[]>([])

  useEffect(() => {
    void storage.listSessions(user.userId, undefined, 500).then(setSessions)
  }, [storage, user.userId])

  const today = todayKey()
  const { streak, playedToday } = computeStreak(sessions)
  const doneToday = new Set(sessions.filter((s) => s.startedAt.startsWith(today)).map((s) => s.gameId))
  const content = pickContent(today)
  const lastPlayed = sessions[0] ? daysBetween(sessions[0].startedAt.slice(0, 10), today) : null

  // 오늘의 목표 (날짜가 같으면 하루 종일 같은 목표)
  const goalGames = useMemo(() => GAMES.map((g) => ({ id: g.id, domain: g.domain })), [])
  const goal = useMemo(() => evaluateGoal(makeDailyGoal(today, sessions, goalGames), sessions, goalGames, today), [today, sessions, goalGames])

  // 맨 위 카드를 누르면 게임 하나를 골라서 바로 시작 (고르는 것도 부담이 되지 않도록)
  const startRandom = () => {
    const id = pickRandomGameId(
      GAMES.map((g) => g.id),
      { doneToday: [...doneToday], lastPlayedId: sessions[0]?.gameId ?? null },
    )
    if (id) navigate({ name: 'game', gameId: id })
  }

  return (
    <div className="stage">
      <div className="stage__body">
        <header className="home__header">
          <div className="home__header-text">
            <h1 className="home__title">오늘의 두뇌운동</h1>
            <p className="home__date">{formatKoreanDate()}</p>
          </div>
          <button
            type="button"
            className="home__avatar-btn"
            onClick={() => navigate({ name: 'account' })}
            aria-label={profile.nickname ? `${profile.nickname}님 내 정보` : '내 정보'}
          >
            <Avatar name={profile.nickname || user.displayName} photoUrl={user.avatarUrl} />
          </button>
        </header>

        <button type="button" className="card home__streak" onClick={startRandom} aria-label="게임 하나를 골라서 바로 시작하기">
          <span className="home__streak-icon" aria-hidden>
            {playedToday ? '🔥' : '🌱'}
          </span>
          <span className="home__streak-text">
            <span className="home__streak-main">
              {streak > 0
                ? `${streak}일 연속 운동 중!`
                : lastPlayed === null
                  ? `${profile.nickname ? `${profile.nickname}님, ` : ''}처음 오셨네요!`
                  : `${profile.nickname ? `${profile.nickname}님, ` : ''}오늘도 시작해볼까요?`}
            </span>
            <span className="home__streak-sub">
              {playedToday
                ? `오늘 ${doneToday.size}가지 게임 완료 · ${GAMES.length - doneToday.size > 0 ? `${GAMES.length - doneToday.size}가지 남았어요` : '전부 다 하셨어요!'}`
                : streak > 0
                  ? '오늘 하면 기록이 이어져요'
                  : '눌러서 바로 시작해보세요'}
            </span>
            <span className="home__streak-cta">👉 바로 시작하기</span>
          </span>
        </button>

        <Card className={`goal${goal.done ? ' goal--done' : ''}`}>
          <div className="goal__head">
            <span className="goal__icon" aria-hidden>
              {goal.done ? '🏅' : '🎯'}
            </span>
            <div className="goal__text">
              <div className="goal__label">오늘의 목표</div>
              <div className="goal__title">{goal.title}</div>
            </div>
          </div>
          <div className="goal__bar" role="progressbar" aria-valuenow={Math.round(goal.ratio * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="goal__fill" style={{ width: `${goal.ratio * 100}%` }} />
          </div>
          <div className="goal__detail">{goal.done ? '해내셨어요! 오늘 목표 달성 🎉' : goal.detail}</div>
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
