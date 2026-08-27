import { useEffect, useState } from 'react'
import type { RoundViewProps } from '../../engine/types'
import { BigButton, NumPad } from '../../ui'
import type { DigitSpanRound } from './types'
import './style.css'

const SHOW_MS = 1000
const GAP_MS = 300

export function RoundView({ round, onAnswer }: RoundViewProps<DigitSpanRound>) {
  const { digits } = round
  // showIndex: -1 = 준비, 0..n-1 = 해당 숫자 표시, n = 입력 단계
  const [showIndex, setShowIndex] = useState(-1)
  const [visible, setVisible] = useState(false)
  const [entered, setEntered] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let cancelled = false
    const timers: number[] = []
    let t = 600 // "잘 보세요" 잠깐
    digits.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          setShowIndex(i)
          setVisible(true)
        }, t),
      )
      t += SHOW_MS
      timers.push(
        window.setTimeout(() => {
          if (!cancelled) setVisible(false)
        }, t),
      )
      t += GAP_MS
    })
    timers.push(
      window.setTimeout(() => {
        if (!cancelled) setShowIndex(digits.length)
      }, t),
    )
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
  }, [digits])

  const inputPhase = showIndex >= digits.length

  const submit = () => {
    if (submitted || entered.length !== digits.length) return
    setSubmitted(true)
    const expected = [...digits].reverse()
    const correct = expected.every((d, i) => d === entered[i])
    onAnswer({ correct, answer: entered.join('') })
  }

  if (!inputPhase) {
    return (
      <div className="ds">
        <p className="prompt prompt--strong">잘 보세요</p>
        <div className="ds__display">
          <span className={`ds__digit${visible ? ' ds__digit--on' : ''}`}>{showIndex >= 0 ? digits[showIndex] : ''}</span>
        </div>
        <div className="ds__dots" aria-hidden>
          {digits.map((_, i) => (
            <span key={i} className={`ds__dot${i <= showIndex ? ' ds__dot--done' : ''}`} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="ds">
      <p className="prompt prompt--strong">거꾸로 눌러주세요</p>
      <div className="ds__slots" aria-label="입력한 숫자">
        {digits.map((_, i) => (
          <span key={i} className={`ds__slot${entered[i] !== undefined ? ' ds__slot--filled' : ''}`}>
            {entered[i] ?? ''}
          </span>
        ))}
      </div>
      <NumPad
        onDigit={(d) => {
          if (entered.length < digits.length) setEntered([...entered, d])
        }}
        onDelete={() => setEntered(entered.slice(0, -1))}
        onSubmit={submit}
        submitDisabled={entered.length !== digits.length || submitted}
      />
      <BigButton
        variant="ghost"
        onClick={() => {
          if (!submitted) {
            setSubmitted(true)
            onAnswer({ correct: false, answer: 'skip' })
          }
        }}
      >
        모르겠어요
      </BigButton>
    </div>
  )
}
