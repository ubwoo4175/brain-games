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
  const picture = round.emojis !== null
  const oneCol = !picture && (long || round.choices.length === 3)

  return (
    <div className="cq">
      <div className="cq__card" key={round.answer}>
        <span className={`cq__chosung${long ? ' cq__chosung--long' : ''}`}>{round.chosung}</span>
        {round.hint && <span className="cq__hint">힌트: {round.hint}</span>}
        {picture && <span className="cq__hint">그림의 이름을 떠올려 보세요</span>}
      </div>
      <div className={`choices${oneCol ? ' choices--col' : ''}`}>
        {round.choices.map((w, i) => (
          <BigButton
            key={w}
            variant="choice"
            className={picture ? 'cq__btn--emoji' : long ? 'cq__btn--long' : ''}
            state={picked === null ? null : w === round.answer ? 'correct' : picked === w ? 'wrong' : null}
            onClick={() => pick(w)}
            aria-label={picture ? `보기 ${i + 1}` : w}
          >
            {picture ? (
              <>
                <span className="cq__emoji" aria-hidden>
                  {round.emojis?.[i]}
                </span>
                {/* 답을 고르고 나면 그림의 이름을 보여줘서 배움이 남게 한다 */}
                {picked !== null && <span className="cq__emoji-word">{w}</span>}
              </>
            ) : (
              w
            )}
          </BigButton>
        ))}
      </div>
    </div>
  )
}
