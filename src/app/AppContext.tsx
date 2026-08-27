import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getAuth, type AuthUser } from '../auth'
import { peekAnonymousUserId } from '../auth/AnonymousAuth'
import { getStorage, type AppSettings, type StorageAdapter } from '../data'
import { DEFAULT_APP_SETTINGS } from '../data/types'
import { GAMES } from '../games'
import { track } from '../shared/track'

interface AppContextValue {
  user: AuthUser
  storage: StorageAdapter
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  /** 게임별 현재 레벨 (없으면 게임 기본값) */
  levels: Record<string, number>
  setLevel: (gameId: string, level: number) => Promise<void>
  resetAll: () => Promise<void>
  /** 서버 동기화(카카오 로그인). available=false 면 로그인 UI를 숨긴다. */
  cloud: { available: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }
}

const Ctx = createContext<AppContextValue | null>(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const storage = useMemo(() => getStorage(), [])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS)
  const [levels, setLevels] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 브라우저가 저장공간을 함부로 정리하지 않게 보호 요청 (지원 브라우저에서만)
      try {
        void navigator.storage?.persist?.()
      } catch {
        /* 미지원 브라우저 */
      }
      const u = await getAuth().getCurrentUser()
      if (u.provider !== 'anonymous') {
        // 첫 로그인이면 이 기기의 익명 기록을 계정으로 병합하고, 서버 기록과 동기화
        const gameIds = GAMES.map((g) => g.id)
        await storage.migrateFrom(peekAnonymousUserId(), u.userId, gameIds)
        await storage.syncDown(u.userId, gameIds)
      }
      const profile = await storage.getProfile(u.userId)
      if (!profile) {
        await storage.saveProfile({ userId: u.userId, nickname: '', createdAt: new Date().toISOString() })
      }
      const s = await storage.getAppSettings(u.userId)
      const lv: Record<string, number> = {}
      for (const g of GAMES) {
        const gs = await storage.getGameSettings(u.userId, g.id)
        lv[g.id] = gs?.level ?? g.defaultLevel
      }
      if (cancelled) return
      setSettings(s)
      setLevels(lv)
      setUser(u)
      track('app_open', { userId: u.userId })
    })()
    return () => {
      cancelled = true
    }
  }, [storage])

  // 글자 크기 설정을 <html data-text-size> 로 반영 (CSS 에서 rem 기준 크기 조절)
  useEffect(() => {
    document.documentElement.dataset.textSize = settings.textSize
  }, [settings.textSize])

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      if (!user) return
      const next = { ...settings, ...patch }
      setSettings(next)
      await storage.saveAppSettings(user.userId, next)
      track('settings_change', patch)
    },
    [user, settings, storage],
  )

  const setLevel = useCallback(
    async (gameId: string, level: number) => {
      if (!user) return
      setLevels((prev) => ({ ...prev, [gameId]: level }))
      await storage.saveGameSettings({ userId: user.userId, gameId, level, updatedAt: new Date().toISOString() })
    },
    [user, storage],
  )

  // 오프라인에서 쌓인 기록을 온라인 복귀 시 서버로
  useEffect(() => {
    if (!user) return
    const onOnline = () => void storage.flushQueue(user.userId)
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [user, storage])

  const cloud = useMemo(
    () => ({
      available: getAuth().canUseCloud(),
      signIn: () => getAuth().signInWithKakao(),
      signOut: async () => {
        await getAuth().signOut()
        // 익명 상태로 처음부터 다시 (상태 꼬임 방지를 위해 새로고침이 가장 안전)
        window.location.reload()
      },
    }),
    [],
  )

  const resetAll = useCallback(async () => {
    if (!user) return
    await storage.clearAll(user.userId)
    await storage.saveProfile({ userId: user.userId, nickname: '', createdAt: new Date().toISOString() })
    setSettings(DEFAULT_APP_SETTINGS)
    const lv: Record<string, number> = {}
    for (const g of GAMES) lv[g.id] = g.defaultLevel
    setLevels(lv)
  }, [user, storage])

  if (!user) return <>{fallback}</>

  return (
    <Ctx.Provider value={{ user, storage, settings, updateSettings, levels, setLevel, resetAll, cloud }}>{children}</Ctx.Provider>
  )
}
