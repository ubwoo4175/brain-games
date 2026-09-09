import { useEffect, useState } from 'react'
import { playFeedback, unlockAudio } from '../../engine/feedback'
import { GAMES } from '../../games'
import { disablePush, enablePush, getPushState, isPushSupported, sendTestPush, type PushState } from '../../shared/push'
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
  const { user, settings, updateSettings, levels, setLevel, resetAll, cloud } = useApp()
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  // 푸시 알림 (매일 오후 2시, 그날 아직 안 하셨을 때만)
  const isLoggedIn = user.provider !== 'anonymous'
  const [pushState, setPushState] = useState<PushState | null>(null)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushMessage, setPushMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getPushState(isLoggedIn).then((s) => {
      if (!cancelled) setPushState(s)
    })
    return () => {
      cancelled = true
    }
  }, [isLoggedIn])

  const togglePush = async (on: boolean) => {
    setPushBusy(true)
    setPushMessage(null)
    try {
      if (on) {
        const res = await enablePush(user.userId)
        if (res.ok) {
          setPushState('on')
          setPushMessage('알림을 켰어요. 매일 오후 2시에 알려드릴게요.')
        } else if (res.reason === 'denied') {
          setPushState('denied')
        } else {
          setPushMessage('알림을 켜지 못했어요. 잠시 뒤 다시 해보세요.')
        }
      } else {
        await disablePush()
        setPushState('off')
        setPushMessage(null)
      }
    } finally {
      setPushBusy(false)
    }
  }

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

        {cloud.available && (
          <>
            <div className="section-title">계정</div>
            <Card>
              {user.provider === 'anonymous' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div className="setting__sub" style={{ textAlign: 'center' }}>
                    구글로 로그인하면 폰을 바꿔도
                    <br />
                    기록과 난이도가 그대로 유지돼요
                  </div>
                  <BigButton className="google-btn" full size="lg" onClick={() => void cloud.signIn()}>
                    <span className="google-btn__g" aria-hidden>G</span> 구글로 로그인
                  </BigButton>
                </div>
              ) : !confirmSignOut ? (
                <div className="setting">
                  <div>
                    <div className="setting__label">구글 계정{user.displayName ? ` · ${user.displayName}` : ''}</div>
                    <div className="setting__sub">기록이 자동으로 안전하게 저장되고 있어요</div>
                  </div>
                  <BigButton variant="secondary" onClick={() => setConfirmSignOut(true)}>
                    로그아웃
                  </BigButton>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="setting__label" style={{ textAlign: 'center' }}>
                    로그아웃할까요? 기록은 서버에 안전하게 남아요.
                  </div>
                  <BigButton
                    variant="danger"
                    full
                    onClick={() => {
                      void cloud.signOut()
                    }}
                  >
                    네, 로그아웃할게요
                  </BigButton>
                  <BigButton variant="secondary" full onClick={() => setConfirmSignOut(false)}>
                    아니요
                  </BigButton>
                </div>
              )}
            </Card>
          </>
        )}

        {isPushSupported() && (
          <>
            <div className="section-title">알림</div>
            <Card>
              {!isLoggedIn ? (
                <div className="setting__sub" style={{ textAlign: 'center' }}>
                  구글로 로그인하면
                  <br />
                  매일 알림을 받을 수 있어요
                </div>
              ) : pushState === 'denied' ? (
                <div className="setting__sub" style={{ textAlign: 'center' }}>
                  휴대폰에서 이 앱의 알림이 꺼져 있어요.
                  <br />
                  폰 설정 → 앱 → 두뇌운동 → 알림에서 켜주세요.
                </div>
              ) : (
                <>
                  <div className="setting">
                    <div>
                      <div className="setting__label">매일 알림 받기</div>
                      <div className="setting__sub">오후 2시 · 그날 아직 안 하셨을 때만</div>
                    </div>
                    <Toggle
                      on={pushState === 'on'}
                      label="매일 알림 받기"
                      onChange={(v) => {
                        if (!pushBusy) void togglePush(v)
                      }}
                    />
                  </div>
                  {pushState === 'on' && (
                    <>
                      <div className="divider" />
                      <BigButton
                        variant="secondary"
                        full
                        disabled={pushBusy}
                        onClick={() => {
                          setPushBusy(true)
                          setPushMessage(null)
                          void sendTestPush()
                            .then((r) => setPushMessage(r.ok ? '보냈어요! 잠시 뒤 알림이 올 거예요.' : '지금은 보내지 못했어요.'))
                            .finally(() => setPushBusy(false))
                        }}
                      >
                        🔔 알림 한 번 보내보기
                      </BigButton>
                    </>
                  )}
                </>
              )}
              {pushMessage && (
                <div className="setting__sub" style={{ textAlign: 'center', marginTop: '0.6rem' }}>
                  {pushMessage}
                </div>
              )}
            </Card>
          </>
        )}

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
