import { useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton } from '../../ui'
import type { QuickMathRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer }: RoundViewProps<QuickMathRound>) {
  const [picked, setPicked] = useState<number | null>(null)

  const pick = (v: number) => {
    if (picked !== null) return
    setPicked(v)
    onAnswer({ correct: v === round.answer, answer: v })
  }

  return (
    <div className="qm">
      <div className="qm__problem" key={round.text + round.answer}>
        <span className="qm__text">{round.text}</span>
        <span className="qm__eq">= ?</span>
      </div>
      <div className="choices">
        {round.choices.map((c) => (
          <BigButton
            key={c}
            variant="choice"
            state={picked === null ? null : c === round.answer ? 'correct' : picked === c ? 'wrong' : null}
            onClick={() => pick(c)}
          >
            {c}
          </BigButton>
        ))}
      </div>
    </div>
  )
}
