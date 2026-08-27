/**
 * 저장 데이터 모델.
 * 지금은 로컬(브라우저)에만 저장하지만, 나중에 서버(Supabase 등)로 옮길 때
 * 테이블 구조가 그대로 되도록 처음부터 userId를 모든 기록에 붙여둡니다.
 */

export interface Profile {
  /** 익명 UUID. 나중에 카카오 로그인하면 이 익명 기록을 계정에 병합. */
  userId: string
  nickname: string
  createdAt: string // ISO
}

export interface GameSettings {
  userId: string
  gameId: string
  /** 현재 난이도 레벨 (게임별 min~max) */
  level: number
  updatedAt: string
}

export interface SessionRecord {
  id: string
  userId: string
  gameId: string
  startedAt: string // ISO
  durationMs: number
  /** 세션 시작 시 레벨 */
  levelStart: number
  /** 세션 종료 시 레벨 */
  levelEnd: number
  correct: number
  total: number
  points: number
  /** 게임별 부가 정보 (자유 형식) */
  details?: Record<string, unknown>
}

export interface AppSettings {
  sound: boolean
  vibration: boolean
  /** 'normal' | 'large' — 글자/버튼 크기 */
  textSize: 'normal' | 'large'
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  sound: true,
  vibration: true,
  textSize: 'normal',
}
