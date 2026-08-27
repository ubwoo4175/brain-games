import { useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import type { OddOneOutRound } from './types'
import './style.css'

export function RoundView({ round, onAnswer }: RoundViewProps<OddOneOutRound>) {
  const { base, odd, oddIndex, count, cols } = round
  const [picked, setPicked] = useState<number | null>(null)

  const tap = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    onAnswer({ correct: i === oddIndex, answer: i })
  }

  return (
    <div className="oo">
      <p className="prompt prompt--strong">다른 것 하나를 찾아 눌러주세요</p>
      <div className="oo__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: count }, (_, i) => {
          const isOdd = i === oddIndex
          const state = picked === null ? '' : isOdd ? ' oo__cell--correct' : picked === i ? ' oo__cell--wrong' : ''
          return (
            <button key={i} type="button" className={`oo__cell${state}`} onClick={() => tap(i)}>
              {isOdd ? odd : base}
            </button>
          )
        })}
      </div>
    </div>
  )
}
