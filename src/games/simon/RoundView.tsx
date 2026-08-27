import { useEffect, useRef, useState } from 'react'
import { playNote } from '../../engine/feedback'
import type { RoundViewProps } from '../../engine/types'
import { PAD_INFO, type SimonPad, type SimonRound } from './types'
import './style.css'

const LIT_MS = 550
const GAP_MS = 250

export function RoundView({ round, onAnswer, settings }: RoundViewProps<SimonRound>) {
  const { seq } = round
  // lit: 지금 불이 켜진 버튼 (보여주기/누르기 공용)
  const [lit, setLit] = useState<SimonPad | null>(null)
  const [showing, setShowing] = useState(true)
  const [progress, setProgress] = useState(0)
  const doneRef = useRef(false)

  // 순서 보여주기
  useEffect(() => {
    let cancelled = false
    const timers: number[] = []
    let t = 700
    seq.forEach((p, i) => {
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          setLit(p)
          playNote(PAD_INFO[p].note, settings)
          if (i === seq.length - 1) {
            timers.push(
              window.setTimeout(() => {
                if (!cancelled) {
                  setLit(null)
                  setShowing(false)
                }
              }, LIT_MS),
            )
          }
        }, t),
      )
      timers.push(window.setTimeout(() => !cancelled && setLit(null), t + LIT_MS))
      t += LIT_MS + GAP_MS
    })
    return () => {
      cancelled = true
      timers.forEach(clearTimeout)
    }
    // settings는 세션 중 안 바뀜
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq])

  const tap = (p: SimonPad) => {
    if (showing || doneRef.current) return
    playNote(PAD_INFO[p].note, settings)
    setLit(p)
    window.setTimeout(() => setLit(null), 200)
    if (p !== seq[progress]) {
      doneRef.current = true
      onAnswer({ correct: false, answer: { failedAt: progress } })
      return
    }
    const next = progress + 1
    setProgress(next)
    if (next >= seq.length) {
      doneRef.current = true
      onAnswer({ correct: true })
    }
  }

  return (
    <div className="sm">
      <p className="prompt prompt--strong">{showing ? '잘 보고 들어보세요' : '같은 순서로 눌러주세요'}</p>
      <div className="sm__dots" aria-hidden>
        {seq.map((_, i) => (
          <span key={i} className={`sm__dot${i < progress ? ' sm__dot--done' : ''}`} />
        ))}
      </div>
      <div className="sm__pads">
        {PAD_INFO.map((info, i) => (
          <button
            key={i}
            type="button"
            className={`sm__pad${lit === i ? ' sm__pad--lit' : ''}`}
            style={{ background: lit === i ? info.press : info.color }}
            onClick={() => tap(i as SimonPad)}
            disabled={showing}
            aria-label={info.label}
          />
        ))}
      </div>
    </div>
  )
}
