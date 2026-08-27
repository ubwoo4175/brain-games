import { useCallback, useEffect, useState } from 'react'
import type { AnyGame } from '../../engine/types'
import { useSession, type SessionSummary } from '../../engine/useSession'
import { formatSeconds } from '../../shared/format'
import { uuid } from '../../shared/uuid'
import { BigButton, Card, FeedbackOverlay, ProgressBar, TopBar } from '../../ui'
import { useApp } from '../AppContext'

interface Props {
  game: AnyGame
  onExit: () => void
}

interface ResultInfo extends SessionSummary {
  previousBest: number
}

/** 화면이 꺼지지 않게 (지원 브라우저에서만) */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    navigator.wakeLock
      .request('screen')
      .then((l) => {
        if (cancelled) void l.release()
        else lock = l
      })
      .catch(() => {})
    return () => {
      cancelled = true
      void lock?.release()
    }
  }, [active])
}

export function GameScreen({ game, onExit }: Props) {
  const { user, storage, settings, levels, setLevel } = useApp()
  const initialLevel = levels[game.id] ?? game.defaultLevel
  const [result, setResult] = useState<ResultInfo | null>(null)
  // "한 번 더" 시 세션 훅을 새로 만들기 위한 키
  const [runKey, setRunKey] = useState(0)

  const onFinish = useCallback(
    async (summary: SessionSummary) => {
      const prev = await storage.listSessions(user.userId, game.id, 500)
      const previousBest = prev.reduce((m, s) => Math.max(m, s.points), 0)
      await storage.saveSession({
        id: uuid(),
        userId: user.userId,
        gameId: game.id,
        startedAt: summary.startedAt,
        durationMs: summary.durationMs,
        levelStart: summary.levelStart,
        levelEnd: summary.levelEnd,
        correct: summary.score.correct,
        total: summary.score.total,
        points: summary.score.points,
        details: { avgResponseMs: Math.round(summary.score.avgResponseMs) },
      })
      await setLevel(game.id, summary.levelEnd)
      setResult({ ...summary, previousBest })
    },
    [storage, user.userId, game.id, setLevel],
  )

  return (
    <SessionView
      key={runKey}
      game={game}
      initialLevel={initialLevel}
      settings={settings}
      onFinish={onFinish}
      result={result}
      onExit={onExit}
      onRetry={() => {
        setResult(null)
        setRunKey((k) => k + 1)
      }}
    />
  )
}

function SessionView({
  game,
  initialLevel,
  settings,
  onFinish,
  result,
  onExit,
  onRetry,
}: {
  game: AnyGame
  initialLevel: number
  settings: { sound: boolean; vibration: boolean }
  onFinish: (s: SessionSummary) => void
  result: ResultInfo | null
  onExit: () => void
  onRetry: () => void
}) {
  const { state, start, answer } = useSession(game, { initialLevel, settings, onFinish })
  useWakeLock(state.phase === 'playing' || state.phase === 'feedback')
  const RoundView = game.RoundView

  if (state.phase === 'intro') {
    return (
      <div className="stage">
        <TopBar title={game.title} onBack={onExit} />
        <div className="stage__body intro">
          <span className="intro__icon" aria-hidden>
            {game.icon}
          </span>
          <h2 className="intro__title">{game.title}</h2>
          <p className="intro__howto">{game.howTo}</p>
          <Card className="intro__level">
            <span className="intro__level-main">현재 레벨 {initialLevel}</span>
            <span className="intro__level-sub">
              {game.levelLabel ? game.levelLabel(initialLevel) : ''}
              {game.mode.kind === 'rounds' ? ` · 문제 ${game.mode.count}개` : ` · ${game.mode.seconds}초`}
            </span>
          </Card>
        </div>
        <div className="stage__footer">
          <BigButton size="xl" full onClick={start}>
            시작하기
          </BigButton>
        </div>
      </div>
    )
  }

  if (state.phase === 'done' && result) {
    const { score, levelStart, levelEnd, previousBest } = result
    const acc = Math.round(score.accuracy * 100)
    const headline = acc >= 80 ? '훌륭해요! 🎉' : acc >= 50 ? '잘하셨어요! 👏' : '수고하셨어요! 🙂'
    const isNewBest = score.points > previousBest && score.points > 0
    return (
      <div className="stage">
        <TopBar title={game.title} onBack={onExit} />
        <div className="stage__body result">
          <h2 className="result__headline">{headline}</h2>
          <div className="result__points">
            {score.points}
            <small> 점</small>
          </div>
          <div className={`result__best${isNewBest ? ' result__best--new' : ''}`}>
            {isNewBest ? '🏆 최고 기록 갱신!' : previousBest > 0 ? `최고 기록 ${previousBest}점` : '첫 기록이에요!'}
          </div>
          <div className="result__grid">
            <Card className="result__stat">
              <span className="result__stat-value">
                {score.correct}/{score.total}
              </span>
              <span className="result__stat-label">맞힌 문제</span>
            </Card>
            <Card className="result__stat">
              <span className="result__stat-value">{acc}%</span>
              <span className="result__stat-label">정확도</span>
            </Card>
            <Card className="result__stat">
              <span className="result__stat-value">
                {levelEnd > levelStart ? `${levelStart}→${levelEnd} ↑` : levelEnd < levelStart ? `${levelStart}→${levelEnd} ↓` : `${levelEnd}`}
              </span>
              <span className="result__stat-label">레벨</span>
            </Card>
          </div>
        </div>
        <div className="stage__footer">
          <BigButton size="xl" full onClick={onRetry}>
            한 번 더
          </BigButton>
          <BigButton variant="secondary" size="lg" full onClick={onExit}>
            다른 게임 하기
          </BigButton>
        </div>
      </div>
    )
  }

  if (state.phase === 'ready' || (state.phase === 'done' && !result)) {
    return (
      <div className="stage">
        <TopBar title={game.title} onBack={onExit} />
        <div className="ready">{state.phase === 'ready' ? '준비!' : '저장 중…'}</div>
      </div>
    )
  }

  // playing / feedback
  const mode = game.mode
  let statusText: string
  let progress: number
  let warn = false
  if (mode.kind === 'rounds') {
    statusText = `${Math.min(state.roundIndex + 1, mode.count)} / ${mode.count}`
    progress = state.roundIndex / mode.count
  } else {
    const remaining = state.remainingMs ?? mode.seconds * 1000
    statusText = formatSeconds(remaining)
    progress = remaining / (mode.seconds * 1000)
    warn = remaining < 10000
  }

  return (
    <div className="stage">
      <TopBar
        title={game.title}
        onBack={onExit}
        right={<span className={`play__status${warn ? ' play__status--warn' : ''}`}>{statusText}</span>}
      />
      <div className="play">
        <ProgressBar value={progress} warn={warn} />
        {state.round !== null && (
          <RoundView
            key={state.roundKey}
            round={state.round}
            level={state.level}
            roundIndex={state.roundIndex}
            onAnswer={answer}
            settings={settings}
          />
        )}
      </div>
      {state.phase === 'feedback' && state.lastCorrect !== null && (
        <FeedbackOverlay correct={state.lastCorrect} levelChange={state.lastLevelChange} />
      )}
    </div>
  )
}
