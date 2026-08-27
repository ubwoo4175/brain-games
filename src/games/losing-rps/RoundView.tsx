import { useEffect, useRef, useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton, ProgressBar } from '../../ui'
import { HAND_INFO, isCorrectPick, type Hand, type LosingRpsRound } from './types'
import './style.css'

const ORDER: Hand[] = ['scissors', 'rock', 'paper']

export function RoundView({ round, onAnswer }: RoundViewProps<LosingRpsRound>) {
  const { shown, rule, timeLimitMs } = round
  const [remaining, setRemaining] = useState(timeLimitMs)
  const [picked, setPicked] = useState<Hand | null>(null)
  const doneRef = useRef(false)
  const onAnswerRef = useRef(onAnswer)
  useEffect(() => {
    onAnswerRef.current = onAnswer
  }, [onAnswer])

  useEffect(() => {
    const start = performance.now()
    const id = window.setInterval(() => {
      const left = timeLimitMs - (performance.now() - start)
      if (left <= 0) {
        clearInterval(id)
        setRemaining(0)
        if (!doneRef.current) {
          doneRef.current = true
          onAnswerRef.current({ correct: false, timedOut: true })
        }
      } else {
        setRemaining(left)
      }
    }, 50)
    return () => clearInterval(id)
  }, [timeLimitMs])

  const pick = (h: Hand) => {
    if (doneRef.current) return
    doneRef.current = true
    setPicked(h)
    onAnswer({ correct: isCorrectPick(shown, rule, h), answer: h })
  }

  const info = HAND_INFO[shown]
  const ratio = remaining / timeLimitMs

  return (
    <div className="rps">
      <div className={`rps__rule rps__rule--${rule}`}>{rule === 'lose' ? '지는 것을 고르세요!' : '이기는 것을 고르세요!'}</div>
      <div className="rps__shown">
        <span className="rps__shown-emoji" aria-hidden>
          {info.emoji}
        </span>
        <span className="rps__shown-label">{info.label}</span>
      </div>
      <ProgressBar value={ratio} warn={ratio < 0.3} />
      <div className="rps__choices">
        {ORDER.map((h) => {
          const state = picked === h ? (isCorrectPick(shown, rule, h) ? 'correct' : 'wrong') : null
          return (
            <BigButton key={h} variant="choice" state={state} onClick={() => pick(h)} className="rps__btn">
              <span className="rps__btn-emoji" aria-hidden>
                {HAND_INFO[h].emoji}
              </span>
              <span>{HAND_INFO[h].label}</span>
            </BigButton>
          )
        })}
      </div>
    </div>
  )
}
