import { LocalStorageAdapter } from './LocalStorageAdapter'
import type { StorageAdapter } from './StorageAdapter'

/**
 * 앱 전체가 공유하는 저장소 인스턴스.
 * 서버 저장소로 바꿀 때는 여기서 new SupabaseAdapter() 로 교체하면 됩니다.
 */
let instance: StorageAdapter | null = null

export function getStorage(): StorageAdapter {
  if (!instance) instance = new LocalStorageAdapter()
  return instance
}

export type { StorageAdapter } from './StorageAdapter'
export * from './types'
