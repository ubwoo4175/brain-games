import { useEffect, useRef, useState } from 'react'
import { playFeedback } from '../../engine/feedback'
import type { RoundViewProps } from '../../engine/types'
import { missAllowance } from './logic'
import type { CardMatchRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer, settings }: RoundViewProps<CardMatchRound>) {
  const { cards, pairs, cols, previewMs } = round
  const [preview, setPreview] = useState(previewMs > 0)
  const [matched, setMatched] = useState<boolean[]>(() => cards.map(() => false))
  const [open, setOpen] = useState<number[]>([])
  const missesRef = useRef(0)
  const doneRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (previewMs <= 0) return
    const id = window.setTimeout(() => setPreview(false), previewMs)
    return () => clearTimeout(id)
  }, [previewMs])

  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }, [])

  const tap = (i: number) => {
    if (preview || doneRef.current || matched[i] || open.includes(i) || open.length >= 2) return
    const nextOpen = [...open, i]
    setOpen(nextOpen)
    if (nextOpen.length < 2) return

    const [a, b] = nextOpen
    if (cards[a] === cards[b]) {
      playFeedback('tap', settings)
      const nextMatched = matched.map((m, idx) => m || idx === a || idx === b)
      setMatched(nextMatched)
      setOpen([])
      if (nextMatched.every(Boolean) && !doneRef.current) {
        doneRef.current = true
        const misses = missesRef.current
        onAnswer({ correct: misses <= missAllowance(pairs), answer: { misses } })
      }
    } else {
      missesRef.current += 1
      // 잠깐 보여주고 다시 뒤집기
      timerRef.current = window.setTimeout(() => setOpen([]), 900)
    }
  }

  return (
    <div className="cm">
      <p className="prompt prompt--strong">{preview ? '잘 보세요' : '같은 그림 두 장을 찾아주세요'}</p>
      <div className="cm__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((c, i) => {
          const faceUp = preview || matched[i] || open.includes(i)
          return (
            <button
              key={i}
              type="button"
              className={`cm__card${faceUp ? ' cm__card--up' : ''}${matched[i] ? ' cm__card--matched' : ''}`}
              onClick={() => tap(i)}
              aria-label={faceUp ? c : `카드 ${i + 1}`}
            >
              {faceUp ? c : '❔'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
