import type { AppSettings, GameSettings, Profile, SessionRecord } from './types'

/**
 * 저장소 인터페이스.
 * 화면/게임 코드는 반드시 이 인터페이스만 사용합니다.
 * - 지금: LocalStorageAdapter (브라우저 localStorage)
 * - 나중: SupabaseAdapter 등으로 교체 (게임 코드 수정 없음)
 *
 * 모든 메서드는 Promise를 반환합니다 — 서버 어댑터로 바꿔도 호출부가 안 바뀌도록.
 */
export interface StorageAdapter {
  getProfile(userId: string): Promise<Profile | null>
  saveProfile(profile: Profile): Promise<void>

  getGameSettings(userId: string, gameId: string): Promise<GameSettings | null>
  saveGameSettings(settings: GameSettings): Promise<void>

  saveSession(record: SessionRecord): Promise<void>
  /** 최신순 정렬. gameId 생략 시 전체. */
  listSessions(userId: string, gameId?: string, limit?: number): Promise<SessionRecord[]>

  getAppSettings(userId: string): Promise<AppSettings>
  saveAppSettings(userId: string, settings: AppSettings): Promise<void>

  /** 해당 사용자 데이터 전체 삭제 (설정 화면 "초기화") */
  clearAll(userId: string): Promise<void>
}
