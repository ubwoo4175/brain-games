/**
 * 인증 인터페이스.
 * - 지금: AnonymousAuth (기기에서 생성한 익명 UUID)
 * - 나중: KakaoAuth 등. 로그인 성공 시 기존 익명 userId의 기록을 새 계정으로 병합하는
 *   migrateFrom(anonymousUserId) 단계를 두면 어머니가 쌓은 기록이 그대로 이어집니다.
 */
export interface AuthUser {
  userId: string
  /** 'anonymous' | 'kakao' | ... */
  provider: string
  displayName?: string
}

export interface AuthProvider {
  /** 현재 사용자. 없으면 익명 사용자를 만들어서라도 반환. */
  getCurrentUser(): Promise<AuthUser>
  signOut(): Promise<void>
}
