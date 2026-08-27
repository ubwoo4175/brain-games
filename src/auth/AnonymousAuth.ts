import { uuid } from '../shared/uuid'
import type { AuthProvider, AuthUser } from './AuthProvider'

const KEY = 'bg:v1:anonymousUserId'

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
