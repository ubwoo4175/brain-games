import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRng } from '../shared/rng'
import { track } from '../shared/track'
import { applyAdaptive, type AdaptiveState } from './adaptive'
import { playFeedback, unlockAudio } from './feedback'
import { scoreSession } from './scoring'
import { DEFAULT_ADAPTIVE, type AnswerInput, type GameDefinition, type RoundResult, type SessionScore } from './types'

export type SessionPhase = 'intro' | 'ready' | 'playing' | 'feedback' | 'done'

export interface SessionState<R> {
  phase: SessionPhase
  level: number
  roundIndex: number
  round: R | null
  /** RoundView 를 새로 마운트하기 위한 키 */
  roundKey: number
  results: RoundResult[]
  /** 마지막 문제 정답 여부 (feedback 단계에서 표시) */
  lastCorrect: boolean | null
  /** 마지막 문제로 레벨이 바뀌었는지 */
  lastLevelChange: -1 | 0 | 1
  /** timed 모드 남은 시간 */
  remainingMs: number | null
}

export interface SessionSummary {
  results: RoundResult[]
  score: SessionScore
  levelStart: number
  levelEnd: number
  startedAt: string
  durationMs: number
}

interface Options {
  initialLevel: number
  settings: { sound: boolean; vibration: boolean }
  onFinish: (summary: SessionSummary) => void
}

const FEEDBACK_MS = { correct: 650, wrong: 1100, levelUp: 1300 }
const READY_MS = 900

/**
 * 공통 세션 루프: intro → ready → (playing → feedback)* → done
 * 게임은 makeRound / RoundView 만 제공하면 됩니다.
 */
export function useSession<R>(game: GameDefinition<R>, opts: Options) {
  const { initialLevel, settings, onFinish } = opts
  const [state, setState] = useState<SessionState<R>>(() => ({
    phase: 'intro',
    level: initialLevel,
    roundIndex: 0,
    round: null,
    roundKey: 0,
    results: [],
    lastCorrect: null,
    lastLevelChange: 0,
    remainingMs: game.mode.kind === 'timed' ? game.mode.seconds * 1000 : null,
  }))

  const rng = useMemo(() => createRng(), [])
  const adaptiveRef = useRef<AdaptiveState>({ level: initialLevel, correctStreak: 0, wrongStreak: 0 })
  const resultsRef = useRef<RoundResult[]>([])
  const roundStartRef = useRef(0)
  const sessionStartRef = useRef(0)
  const answeredRef = useRef(false)
  const finishedRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)
  const prevRoundRef = useRef<R | undefined>(undefined)
  const levelStartRef = useRef(initialLevel)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    onFinishRef.current = onFinish
  }, [onFinish])

  const clearPending = () => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  const finish = useCallback(() => {
    if (finishedRef.current) return
    finishedRef.current = true
    clearPending()
    const results = resultsRef.current
    const score = scoreSession(results)
    const summary: SessionSummary = {
      results,
      score,
      levelStart: levelStartRef.current,
      levelEnd: adaptiveRef.current.level,
      startedAt: new Date(sessionStartRef.current).toISOString(),
      durationMs: Date.now() - sessionStartRef.current,
    }
    playFeedback('finish', settings)
    setState((s) => ({ ...s, phase: 'done', round: null, remainingMs: s.remainingMs === null ? null : Math.max(0, s.remainingMs) }))
    track('session_end', { gameId: game.id, ...score, levelStart: summary.levelStart, levelEnd: summary.levelEnd })
    onFinishRef.current(summary)
  }, [game.id, settings])

  const nextRound = useCallback(
    (roundIndex: number) => {
      const level = adaptiveRef.current.level
      const round = game.makeRound(level, rng, { roundIndex, previous: prevRoundRef.current })
      prevRoundRef.current = round
      answeredRef.current = false
      roundStartRef.current = performance.now()
      setState((s) => ({
        ...s,
        phase: 'playing',
        level,
        roundIndex,
        round,
        roundKey: s.roundKey + 1,
        lastCorrect: null,
        lastLevelChange: 0,
      }))
    },
    [game, rng],
  )

  const start = useCallback(() => {
    unlockAudio()
    finishedRef.current = false
    resultsRef.current = []
    prevRoundRef.current = undefined
    adaptiveRef.current = { level: initialLevel, correctStreak: 0, wrongStreak: 0 }
    levelStartRef.current = initialLevel
    sessionStartRef.current = Date.now()
    setState((s) => ({
      ...s,
      phase: 'ready',
      level: initialLevel,
      results: [],
      roundIndex: 0,
      round: null,
      remainingMs: game.mode.kind === 'timed' ? game.mode.seconds * 1000 : null,
    }))
    track('session_start', { gameId: game.id, level: initialLevel })
    clearPending()
    timeoutRef.current = window.setTimeout(() => nextRound(0), READY_MS)
  }, [game, initialLevel, nextRound])

  const answer = useCallback(
    (input: AnswerInput) => {
      if (answeredRef.current || finishedRef.current) return
      answeredRef.current = true
      const responseMs = performance.now() - roundStartRef.current
      const level = adaptiveRef.current.level
      const result: RoundResult = { ...input, level, responseMs }
      resultsRef.current = [...resultsRef.current, result]

      const rule = game.adaptive ?? DEFAULT_ADAPTIVE
      const { state: nextAdaptive, changed } = applyAdaptive(adaptiveRef.current, input.correct, rule, game.minLevel, game.maxLevel)
      adaptiveRef.current = nextAdaptive
      if (changed !== 0) track('level_change', { gameId: game.id, from: level, to: nextAdaptive.level })
      track('round_answer', { gameId: game.id, level, correct: input.correct, responseMs: Math.round(responseMs) })

      playFeedback(changed === 1 ? 'levelUp' : input.correct ? 'correct' : 'wrong', settings)

      const roundIndex = resultsRef.current.length - 1
      setState((s) => ({ ...s, phase: 'feedback', results: resultsRef.current, lastCorrect: input.correct, lastLevelChange: changed }))

      const isLast = game.mode.kind === 'rounds' && roundIndex + 1 >= game.mode.count
      const delay = changed === 1 ? FEEDBACK_MS.levelUp : input.correct ? FEEDBACK_MS.correct : FEEDBACK_MS.wrong
      clearPending()
      timeoutRef.current = window.setTimeout(() => {
        if (finishedRef.current) return
        if (isLast) finish()
        else nextRound(roundIndex + 1)
      }, delay)
    },
    [game, settings, finish, nextRound],
  )

  // timed 모드: 남은 시간 카운트다운
  useEffect(() => {
    if (game.mode.kind !== 'timed') return
    if (state.phase !== 'playing' && state.phase !== 'feedback') return
    const total = game.mode.seconds * 1000
    const id = window.setInterval(() => {
      const elapsed = Date.now() - sessionStartRef.current - READY_MS
      const remaining = total - elapsed
      if (remaining <= 0) {
        setState((s) => ({ ...s, remainingMs: 0 }))
        finish()
      } else {
        setState((s) => ({ ...s, remainingMs: remaining }))
      }
    }, 200)
    return () => clearInterval(id)
  }, [game.mode, state.phase, finish])

  // 언마운트 시 대기 중 타이머 정리
  useEffect(() => () => clearPending(), [])

  return { state, start, answer, quit: finish }
}
