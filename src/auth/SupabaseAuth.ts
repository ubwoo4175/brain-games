import { getSupabase, isCloudConfigured } from '../shared/supabase'
import { AnonymousAuth } from './AnonymousAuth'
import type { AuthProvider, AuthUser } from './AuthProvider'

/**
 * Supabase 세션(카카오 로그인)이 있으면 그 계정을, 없으면 익명 사용자를 돌려주는 인증.
 * - Supabase 환경변수가 없으면 언제나 익명 → 앱은 로컬 전용으로 동작.
 * - 로그인은 카카오 OAuth 리다이렉트: 페이지를 떠났다가 ?code= 를 달고 돌아오고,
 *   supabase-js 가 복귀 시 자동으로 세션으로 바꿔준다.
 */
export class SupabaseAuth implements AuthProvider {
  private anon = new AnonymousAuth()

  canUseCloud(): boolean {
    return isCloudConfigured()
  }

  async getCurrentUser(): Promise<AuthUser> {
    const sb = getSupabase()
    if (sb) {
      const { data } = await sb.auth.getSession()
      const u = data.session?.user
      if (u) {
        const meta = (u.user_metadata ?? {}) as Record<string, unknown>
        const name = [meta.name, meta.nickname, meta.preferred_username].find((v) => typeof v === 'string' && v)
        return { userId: u.id, provider: 'kakao', displayName: name as string | undefined }
      }
    }
    return this.anon.getCurrentUser()
  }

  /** 카카오 로그인 시작 (페이지가 카카오로 이동했다가 앱으로 돌아옴) */
  async signInWithKakao(): Promise<void> {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  }

  async signOut(): Promise<void> {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
  }
}
