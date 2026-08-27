import { useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton } from '../../ui'
import { COLOR_IDS, COLOR_INFO, stroopAnswer, type ColorId, type StroopRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer }: RoundViewProps<StroopRound>) {
  const [picked, setPicked] = useState<ColorId | null>(null)
  const answer = stroopAnswer(round)

  const pick = (c: ColorId) => {
    if (picked !== null) return
    setPicked(c)
    onAnswer({ correct: c === answer, answer: c })
  }

  return (
    <div className="st">
      <div className={`st__ask st__ask--${round.ask}`}>{round.ask === 'ink' ? '글자의 색깔을 고르세요!' : '글자의 뜻을 고르세요!'}</div>
      <div className="st__word-card" key={`${round.word}-${round.ink}`}>
        <span className="st__word" style={{ color: COLOR_INFO[round.ink].ink }}>
          {COLOR_INFO[round.word].label}
        </span>
      </div>
      <div className="choices">
        {COLOR_IDS.map((c) => (
          <BigButton
            key={c}
            variant="choice"
            className="st__btn"
            state={picked === null ? null : c === answer ? 'correct' : picked === c ? 'wrong' : null}
            onClick={() => pick(c)}
          >
            <span className="st__swatch" style={{ background: COLOR_INFO[c].swatch }} aria-hidden />
            <span>{COLOR_INFO[c].label}</span>
          </BigButton>
        ))}
      </div>
    </div>
  )
}
