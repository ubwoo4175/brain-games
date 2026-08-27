import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import './theme.css'
import './components.css'

/* ---------- BigButton ---------- */
export interface BigButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'choice' | 'ghost' | 'danger'
  size?: 'md' | 'lg' | 'xl'
  full?: boolean
  /** 답 제출 후 정답/오답 표시 */
  state?: 'correct' | 'wrong' | null
}

export function BigButton({ variant = 'primary', size = 'md', full, state, className = '', children, ...rest }: BigButtonProps) {
  const cls = [
    'btn',
    `btn--${variant}`,
    size !== 'md' ? `btn--${size}` : '',
    full ? 'btn--full' : '',
    state ? `btn--state-${state}` : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  )
}

/* ---------- TopBar ---------- */
export function TopBar({ title, onBack, right }: { title: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="topbar__back" onClick={onBack} aria-label="뒤로">
          ←
        </button>
      ) : (
        <span />
      )}
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__right">{right}</div>
    </header>
  )
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({ value, warn }: { value: number; warn?: boolean }) {
  const pct = Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="progress" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`progress__fill${warn ? ' progress__fill--warn' : ''}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ---------- Card ---------- */
export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {children}
    </div>
  )
}

/* ---------- NumPad ---------- */
export function NumPad({
  onDigit,
  onDelete,
  onSubmit,
  submitDisabled,
  submitLabel = '확인',
}: {
  onDigit: (d: number) => void
  onDelete: () => void
  onSubmit: () => void
  submitDisabled?: boolean
  submitLabel?: string
}) {
  return (
    <div className="numpad">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
        <BigButton key={d} variant="choice" onClick={() => onDigit(d)} aria-label={`${d}`}>
          {d}
        </BigButton>
      ))}
      <BigButton variant="secondary" onClick={onDelete} aria-label="지우기">
        ⌫
      </BigButton>
      <BigButton variant="choice" onClick={() => onDigit(0)}>
        0
      </BigButton>
      <BigButton variant="primary" onClick={onSubmit} disabled={submitDisabled}>
        {submitLabel}
      </BigButton>
    </div>
  )
}

/* ---------- FeedbackOverlay ---------- */
export function FeedbackOverlay({ correct, levelChange }: { correct: boolean; levelChange: -1 | 0 | 1 }) {
  if (levelChange === 1) {
    return (
      <div className="feedback" aria-live="assertive">
        <div className="feedback__badge feedback__badge--levelup">
          <span className="feedback__icon">🎉</span>
          <span>레벨 업!</span>
          <span className="feedback__sub">조금 더 어려워져요</span>
        </div>
      </div>
    )
  }
  return (
    <div className="feedback" aria-live="assertive">
      <div className={`feedback__badge feedback__badge--${correct ? 'correct' : 'wrong'}`}>
        <span className="feedback__icon">{correct ? '⭕' : '❌'}</span>
        <span>{correct ? '정답!' : '아쉬워요'}</span>
        {levelChange === -1 && <span className="feedback__sub">조금 쉽게 해볼게요</span>}
      </div>
    </div>
  )
}
