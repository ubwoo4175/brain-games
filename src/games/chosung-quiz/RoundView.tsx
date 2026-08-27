import { useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton } from '../../ui'
import type { ChosungRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer }: RoundViewProps<ChosungRound>) {
  const [picked, setPicked] = useState<string | null>(null)

  const pick = (w: string) => {
    if (picked !== null) return
    setPicked(w)
    onAnswer({ correct: w === round.answer, answer: w })
  }

  const long = round.answer.length > 4
  const oneCol = long || round.choices.length === 3

  return (
    <div className="cq">
      <div className="cq__card" key={round.answer}>
        <span className={`cq__chosung${long ? ' cq__chosung--long' : ''}`}>{round.chosung}</span>
        {round.hint && <span className="cq__hint">힌트: {round.hint}</span>}
      </div>
      <div className={`choices${oneCol ? ' choices--col' : ''}`}>
        {round.choices.map((w) => (
          <BigButton
            key={w}
            variant="choice"
            className={long ? 'cq__btn--long' : ''}
            state={picked === null ? null : w === round.answer ? 'correct' : picked === w ? 'wrong' : null}
            onClick={() => pick(w)}
          >
            {w}
          </BigButton>
        ))}
      </div>
    </div>
  )
}
