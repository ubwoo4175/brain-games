import { useEffect, useState } from 'react'
import type { SessionRecord } from '../../data'
import { buildWeekly, weeklyMax, weeklySummary } from '../../engine/weekly'
import { GAMES } from '../../games'
import { todayKey } from '../../shared/format'
import { Card, TopBar } from '../../ui'
import { useApp } from '../AppContext'

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const { user, storage, levels } = useApp()
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)

  useEffect(() => {
    void storage.listSessions(user.userId, undefined, 2000).then(setSessions)
  }, [storage, user.userId])

  const all = sessions ?? []
  const playedDays = new Set(all.map((s) => s.startedAt.slice(0, 10)))

  // 최근 7일 일별 점수 (오늘이 맨 오른쪽)
  const week = buildWeekly(all)
  const max = weeklyMax(week)

  return (
    <div className="stage">
      <TopBar title="기록" onBack={onBack} />
      <div className="stage__body">
        <Card>
          <div className="section-title" style={{ marginTop: 0 }}>
            최근 7일 점수
          </div>
          <div
            className="chart"
            role="img"
            aria-label={`최근 7일 일별 점수. ${week.map((d) => `${d.label}요일 ${d.points}점`).join(', ')}`}
          >
            {week.map((d) => (
              <div key={d.key} className={`chart__col${d.isToday ? ' chart__col--today' : ''}`}>
                <span className="chart__value">{d.points > 0 ? d.points : ''}</span>
                <span className="chart__track">
                  <span
                    className={`chart__bar${d.points === 0 ? ' chart__bar--empty' : ''}`}
                    style={{ height: d.points > 0 ? `${Math.max(8, (d.points / max) * 100)}%` : undefined }}
                  />
                </span>
                <span className="chart__label">{d.label}</span>
              </div>
            ))}
          </div>
          <div className="setting__sub chart__summary">{weeklySummary(week)}</div>
          <div className="divider" />
          <div className="setting__sub" style={{ textAlign: 'center' }}>
            지금까지 {playedDays.size}일 운동 · 총 {all.length}회
          </div>
        </Card>

        {sessions && all.length === 0 && <div className="stats__empty">아직 기록이 없어요. 게임을 하나 해보세요!</div>}

        {GAMES.map((g) => {
          const list = all.filter((s) => s.gameId === g.id)
          if (list.length === 0) return null
          const best = list.reduce((m, s) => Math.max(m, s.points), 0)
          const recent = list.slice(0, 5)
          const recentAcc = Math.round((recent.reduce((a, s) => a + (s.total ? s.correct / s.total : 0), 0) / recent.length) * 100)
          const lastKey = list[0].startedAt.slice(0, 10)
          const lastLabel = lastKey === todayKey() ? '오늘' : `${Number(lastKey.slice(5, 7))}/${Number(lastKey.slice(8, 10))}`
          return (
            <Card key={g.id}>
              <div className="stats__game">
                <span className="stats__game-icon" aria-hidden>
                  {g.icon}
                </span>
                <div>
                  <div className="stats__game-title">{g.title}</div>
                  <div className="setting__sub">
                    레벨 {levels[g.id] ?? g.defaultLevel}
                    {g.levelLabel ? ` · ${g.levelLabel(levels[g.id] ?? g.defaultLevel)}` : ''}
                  </div>
                </div>
              </div>
              <div className="stats__row">
                <div className="stats__cell">
                  <span className="stats__cell-value">{list.length}</span>
                  <span className="stats__cell-label">플레이</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__cell-value">{best}</span>
                  <span className="stats__cell-label">최고 점수</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__cell-value">{recentAcc}%</span>
                  <span className="stats__cell-label">정확도</span>
                </div>
                <div className="stats__cell">
                  <span className="stats__cell-value">{lastLabel}</span>
                  <span className="stats__cell-label">마지막</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
