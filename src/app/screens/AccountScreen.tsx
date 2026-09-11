import { useEffect, useState } from 'react'
import type { SessionRecord } from '../../data'
import { todayKey } from '../../shared/format'
import { Avatar, BigButton, Card, TopBar } from '../../ui'
import { MAX_NICKNAME, useApp } from '../AppContext'

/** 가입일을 "2026년 9월 11일" 로 */
function formatJoined(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

/** 한 줄짜리 정보 행 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="setting">
      <div className="setting__label">{label}</div>
      <div className="setting__sub account__value">{value}</div>
    </div>
  )
}

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { user, storage, profile, updateProfile, cloud } = useApp()
  const isLoggedIn = user.provider !== 'anonymous'

  const [sessions, setSessions] = useState<SessionRecord[] | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile.nickname)
  const [confirmSignOut, setConfirmSignOut] = useState(false)

  useEffect(() => {
    void storage.listSessions(user.userId, undefined, 2000).then(setSessions)
  }, [storage, user.userId])

  const all = sessions ?? []
  const playedDays = new Set(all.map((s) => s.startedAt.slice(0, 10))).size
  const totalPoints = all.reduce((n, s) => n + s.points, 0)
  const playedToday = all.some((s) => s.startedAt.startsWith(todayKey()))

  const save = () => {
    void updateProfile({ nickname: draft }).then(() => setEditing(false))
  }

  return (
    <div className="stage">
      <TopBar title="내 정보" onBack={onBack} />
      <div className="stage__body">
        <Card className="account__head">
          <Avatar name={profile.nickname || user.displayName} photoUrl={user.avatarUrl} size="lg" />
          <div className="account__name">{profile.nickname || '이름을 정해주세요'}</div>
          <div className="setting__sub">{isLoggedIn ? '구글 계정으로 로그인 중이에요' : '이 기기에만 저장되고 있어요'}</div>
        </Card>

        {editing ? (
          <Card>
            <div className="setting__label">뭐라고 부를까요?</div>
            <input
              className="account__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_NICKNAME))}
              maxLength={MAX_NICKNAME}
              placeholder="예: 영희"
              autoFocus
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
              }}
            />
            <div className="setting__sub" style={{ marginBottom: '0.6rem' }}>{MAX_NICKNAME}글자까지 쓸 수 있어요</div>
            <div className="account__edit-actions">
              <BigButton full onClick={save}>
                저장
              </BigButton>
              <BigButton
                variant="secondary"
                full
                onClick={() => {
                  setDraft(profile.nickname)
                  setEditing(false)
                }}
              >
                취소
              </BigButton>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="setting">
              <div>
                <div className="setting__label">이름</div>
                <div className="setting__sub">{profile.nickname || '아직 정하지 않았어요'}</div>
              </div>
              <BigButton
                variant="secondary"
                onClick={() => {
                  setDraft(profile.nickname)
                  setEditing(true)
                }}
              >
                바꾸기
              </BigButton>
            </div>
            <div className="divider" />
            <InfoRow label="로그인" value={isLoggedIn ? (user.email ?? '구글 계정') : '안 함'} />
            <div className="divider" />
            <InfoRow label="시작한 날" value={formatJoined(profile.createdAt)} />
          </Card>
        )}

        <div className="section-title">지금까지</div>
        <Card>
          <div className="account__stats">
            <div className="account__stat">
              <span className="account__stat-num">{playedDays}</span>
              <span className="account__stat-label">운동한 날</span>
            </div>
            <div className="account__stat">
              <span className="account__stat-num">{all.length}</span>
              <span className="account__stat-label">게임 횟수</span>
            </div>
            <div className="account__stat">
              <span className="account__stat-num">{totalPoints.toLocaleString('ko-KR')}</span>
              <span className="account__stat-label">모은 점수</span>
            </div>
          </div>
          <div className="setting__sub" style={{ textAlign: 'center', marginTop: '0.6rem' }}>
            {playedToday ? '오늘도 운동하셨어요. 멋져요! 👏' : '오늘은 아직이에요. 하나만 해볼까요?'}
          </div>
        </Card>

        {cloud.available && (
          <>
            <div className="section-title">계정</div>
            <Card>
              {!isLoggedIn ? (
                <div className="account__signin">
                  <div className="setting__sub" style={{ textAlign: 'center' }}>
                    구글로 로그인하면 폰을 바꿔도
                    <br />
                    기록과 난이도가 그대로 유지돼요
                  </div>
                  <BigButton className="google-btn" full size="lg" onClick={() => void cloud.signIn()}>
                    <span className="google-btn__g" aria-hidden>
                      G
                    </span>{' '}
                    구글로 로그인
                  </BigButton>
                </div>
              ) : !confirmSignOut ? (
                <BigButton variant="secondary" full onClick={() => setConfirmSignOut(true)}>
                  로그아웃
                </BigButton>
              ) : (
                <div className="account__signin">
                  <div className="setting__label" style={{ textAlign: 'center' }}>
                    로그아웃할까요? 기록은 서버에 안전하게 남아요.
                  </div>
                  <BigButton variant="danger" full onClick={() => void cloud.signOut()}>
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
      </div>
    </div>
  )
}
