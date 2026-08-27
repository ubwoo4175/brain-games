import { useRef, useState } from 'react'
import { playFeedback } from '../../engine/feedback'
import type { RoundViewProps } from '../../engine/types'
import { MISS_ALLOWANCE } from './logic'
import type { NumberTouchRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer, settings }: RoundViewProps<NumberTouchRound>) {
  const { n, cells, cols } = round
  const [next, setNext] = useState(1)
  const [shakeAt, setShakeAt] = useState<number | null>(null)
  const missesRef = useRef(0)
  const doneRef = useRef(false)

  const tap = (idx: number) => {
    const value = cells[idx]
    if (doneRef.current || value === null || value < next) return
    if (value === next) {
      playFeedback('tap', settings)
      if (value === n) {
        doneRef.current = true
        const misses = missesRef.current
        onAnswer({ correct: misses <= MISS_ALLOWANCE, answer: { misses } })
        return
      }
      setNext(value + 1)
    } else {
      missesRef.current += 1
      setShakeAt(idx)
      window.setTimeout(() => setShakeAt(null), 350)
    }
  }

  return (
    <div className="nt">
      <p className="prompt prompt--strong">
        <span className="nt__next">{next}</span> 을(를) 눌러주세요 — 1부터 {n}까지 순서대로!
      </p>
      <div className="nt__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cells.map((v, i) => {
          if (v === null) return <span key={i} className="nt__empty" aria-hidden />
          const done = v < next
          return (
            <button
              key={i}
              type="button"
              className={`nt__cell${done ? ' nt__cell--done' : ''}${shakeAt === i ? ' nt__cell--shake' : ''}`}
              onClick={() => tap(i)}
              disabled={done}
            >
              {v}
            </button>
          )
        })}
      </div>
    </div>
  )
}
