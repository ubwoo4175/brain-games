import { useState } from 'react'
import { playFeedback, unlockAudio } from '../../engine/feedback'
import { GAMES } from '../../games'
import { BigButton, Card, TopBar } from '../../ui'
import { useApp } from '../AppContext'

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' toggle--on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
    >
      <span className="toggle__knob" />
    </button>
  )
}

export function SettingsScreen({ onBack }: { onBack: () => void }) {
  const { settings, updateSettings, levels, setLevel, resetAll } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)

  return (
    <div className="stage">
      <TopBar title="설정" onBack={onBack} />
      <div className="stage__body">
        <Card>
          <div className="setting">
            <div>
              <div className="setting__label">소리</div>
              <div className="setting__sub">정답·오답 효과음</div>
            </div>
            <Toggle
              on={settings.sound}
              label="소리"
              onChange={(v) => {
                void updateSettings({ sound: v })
                if (v) {
                  unlockAudio()
                  playFeedback('correct', { sound: true, vibration: false })
                }
              }}
            />
          </div>
          <div className="divider" />
          <div className="setting">
            <div>
              <div className="setting__label">진동</div>
              <div className="setting__sub">정답·오답 때 살짝 진동</div>
            </div>
            <Toggle
              on={settings.vibration}
              label="진동"
              onChange={(v) => {
                void updateSettings({ vibration: v })
                if (v) playFeedback('correct', { sound: false, vibration: true })
              }}
            />
          </div>
          <div className="divider" />
          <div className="setting">
            <div>
              <div className="setting__label">글자 크기</div>
            </div>
            <div className="segmented">
              <BigButton variant={settings.textSize === 'normal' ? 'primary' : 'secondary'} onClick={() => void updateSettings({ textSize: 'normal' })}>
                보통
              </BigButton>
              <BigButton variant={settings.textSize === 'large' ? 'primary' : 'secondary'} onClick={() => void updateSettings({ textSize: 'large' })}>
                크게
              </BigButton>
            </div>
          </div>
        </Card>

        <div className="section-title">게임별 난이도 (자동으로도 조절돼요)</div>
        <Card>
          {GAMES.map((g, i) => {
            const lv = levels[g.id] ?? g.defaultLevel
            return (
              <div key={g.id}>
                {i > 0 && <div className="divider" />}
                <div className="setting">
                  <div>
                    <div className="setting__label">
                      {g.icon} {g.title}
                    </div>
                    <div className="setting__sub">{g.levelLabel ? g.levelLabel(lv) : `레벨 ${lv}`}</div>
                  </div>
                  <div className="stepper">
                    <BigButton variant="secondary" disabled={lv <= g.minLevel} onClick={() => void setLevel(g.id, lv - 1)} aria-label="쉽게">
                      −
                    </BigButton>
                    <span className="stepper__value">{lv}</span>
                    <BigButton variant="secondary" disabled={lv >= g.maxLevel} onClick={() => void setLevel(g.id, lv + 1)} aria-label="어렵게">
                      +
                    </BigButton>
                  </div>
                </div>
              </div>
            )
          })}
        </Card>

        <div className="section-title">데이터</div>
        <Card>
          {!confirmReset ? (
            <BigButton variant="danger" full onClick={() => setConfirmReset(true)}>
              모든 기록 지우기
            </BigButton>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="setting__label" style={{ textAlign: 'center' }}>
                정말 모든 기록과 설정을 지울까요?
              </div>
              <BigButton
                variant="danger"
                full
                onClick={() => {
                  void resetAll().then(() => setConfirmReset(false))
                }}
              >
                네, 지울게요
              </BigButton>
              <BigButton variant="secondary" full onClick={() => setConfirmReset(false)}>
                아니요
              </BigButton>
            </div>
          )}
        </Card>

        <div className="setting__sub" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
          오늘의 두뇌운동 v{__APP_VERSION__}
        </div>
      </div>
    </div>
  )
}
