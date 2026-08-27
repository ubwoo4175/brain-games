import { useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton } from '../../ui'
import type { ClockRound } from './types'
import './style.css'

/** 아날로그 시계 (SVG). 크기는 CSS가 정한다. */
function ClockFace({ h, m }: { h: number; m: number }) {
  const hourAngle = ((h % 12) + m / 60) * 30
  const minuteAngle = m * 6
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const n = i + 1
    const a = (n * 30 * Math.PI) / 180
    return { n, x: 50 + 38 * Math.sin(a), y: 50 - 38 * Math.cos(a) }
  })
  return (
    <svg viewBox="0 0 100 100" className="ck__face" role="img" aria-label="시계">
      <circle cx="50" cy="50" r="48" className="ck__rim" />
      {numbers.map(({ n, x, y }) => (
        <text key={n} x={x} y={y} className="ck__num" textAnchor="middle" dominantBaseline="central">
          {n}
        </text>
      ))}
      <g transform={`rotate(${hourAngle} 50 50)`}>
        <line x1="50" y1="54" x2="50" y2="26" className="ck__hand ck__hand--hour" />
      </g>
      <g transform={`rotate(${minuteAngle} 50 50)`}>
        <line x1="50" y1="54" x2="50" y2="14" className="ck__hand ck__hand--minute" />
      </g>
      <circle cx="50" cy="50" r="3" className="ck__pin" />
    </svg>
  )
}

export function RoundView({ round, onAnswer }: RoundViewProps<ClockRound>) {
  const [picked, setPicked] = useState<string | null>(null)

  const pick = (c: string) => {
    if (picked !== null) return
    setPicked(c)
    onAnswer({ correct: c === round.answer, answer: c })
  }

  return (
    <div className="ck">
      <p className="prompt prompt--strong">시계가 가리키는 시각은?</p>
      <div className="ck__card" key={round.answer}>
        <ClockFace h={round.time.h} m={round.time.m} />
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
