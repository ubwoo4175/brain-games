import { SupabaseSyncAdapter } from './SupabaseSyncAdapter'

/**
 * 앱 전체가 공유하는 저장소 인스턴스.
 * SupabaseSyncAdapter 는 로컬 우선으로 동작하고, Supabase 설정 + 카카오 로그인이 있을 때만
 * 백그라운드로 서버에 동기화합니다. 미설정이면 예전 LocalStorageAdapter 와 완전히 같게 동작.
 */
let instance: SupabaseSyncAdapter | null = null

export function getStorage(): SupabaseSyncAdapter {
  if (!instance) instance = new SupabaseSyncAdapter()
  return instance
}

export type { StorageAdapter } from './StorageAdapter'
export * from './types'
