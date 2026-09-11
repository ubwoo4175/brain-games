import { getSupabase, isCloudConfigured } from '../shared/supabase'
import { AnonymousAuth } from './AnonymousAuth'
import type { AuthProvider, AuthUser } from './AuthProvider'

/**
 * Supabase 세션(구글 로그인)이 있으면 그 계정을, 없으면 익명 사용자를 돌려주는 인증.
 * - Supabase 환경변수가 없으면 언제나 익명 → 앱은 로컬 전용으로 동작.
 * - 로그인은 구글 OAuth 리다이렉트: 페이지를 떠났다가 ?code= 를 달고 돌아오고,
 *   supabase-js 가 복귀 시 자동으로 세션으로 바꿔준다.
 *
 * 카카오를 쓰지 않는 이유: Supabase 의 카카오 provider 는 `account_email` 동의를 반드시
 * 요청하는데, 그 항목은 카카오 "비즈 앱"에서만 쓸 수 있어 개인 앱에서는 KOE205 로 막힙니다
 * (앱에서 scopes 를 지정해도 기본 scope 에 더해질 뿐 뺄 수 없음). docs/SUPABASE_SETUP.md 참고.
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
        const pick = (...keys: string[]) => keys.map((k) => meta[k]).find((v) => typeof v === 'string' && v) as string | undefined
        return {
          userId: u.id,
          provider: 'google',
          displayName: pick('name', 'full_name', 'nickname', 'preferred_username'),
          email: u.email ?? pick('email'),
          avatarUrl: pick('avatar_url', 'picture'),
        }
      }
    }
    return this.anon.getCurrentUser()
  }

  /** 구글 로그인 시작 (페이지가 구글로 이동했다가 앱으로 돌아옴) */
  async signIn(): Promise<void> {
    const sb = getSupabase()
    if (!sb) return
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
  }

  async signOut(): Promise<void> {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
  }
}
