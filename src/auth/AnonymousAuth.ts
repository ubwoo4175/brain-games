import { uuid } from '../shared/uuid'
import type { AuthProvider, AuthUser } from './AuthProvider'

const KEY = 'bg:v1:anonymousUserId'

/** 이 기기에 저장된 익명 userId (없으면 null). 카카오 로그인 시 기록 병합에 사용. */
export function peekAnonymousUserId(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export class AnonymousAuth implements AuthProvider {
  async getCurrentUser(): Promise<AuthUser> {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = uuid()
      localStorage.setItem(KEY, id)
    }
    return { userId: id, provider: 'anonymous' }
  }
  async signOut() {
    /* 익명 사용자는 로그아웃 개념이 없음 */
  }
}
