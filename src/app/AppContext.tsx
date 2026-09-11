import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getAuth, type AuthUser } from '../auth'
import { peekAnonymousUserId } from '../auth/AnonymousAuth'
import { getStorage, type AppSettings, type Profile, type StorageAdapter } from '../data'
import { DEFAULT_APP_SETTINGS } from '../data/types'
import { GAMES } from '../games'
import { track } from '../shared/track'

interface AppContextValue {
  user: AuthUser
  storage: StorageAdapter
  /** 사용자 프로필(별명·가입일). 없으면 만들어져 있으므로 항상 존재. */
  profile: Profile
  /** 별명 등 프로필 수정 (로컬 저장 + 로그인 상태면 서버에도) */
  updateProfile: (patch: Partial<Pick<Profile, 'nickname'>>) => Promise<void>
  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  /** 게임별 현재 레벨 (없으면 게임 기본값) */
  levels: Record<string, number>
  setLevel: (gameId: string, level: number) => Promise<void>
  resetAll: () => Promise<void>
  /** 서버 동기화(구글 로그인). available=false 면 로그인 UI를 숨긴다. */
  cloud: { available: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }
}

/** 별명 최대 길이 — 홈 화면 한 줄에 들어가도록 */
export const MAX_NICKNAME = 10

const Ctx = createContext<AppContextValue | null>(null)

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const storage = useMemo(() => getStorage(), [])
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
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

      /** 로컬 저장소만 읽어 화면에 필요한 상태를 만든다 (네트워크 없음) */
      const loadLocal = async () => {
        // 프로필: 없으면 만들고, 별명이 비어 있으면 구글 계정 이름으로 채워준다
        // (어머니가 직접 별명을 지우신 게 아니라 처음부터 빈 경우만 해당)
        const saved = await storage.getProfile(u.userId)
        let p: Profile = saved ?? { userId: u.userId, nickname: '', createdAt: new Date().toISOString() }
        const fromAccount = (u.displayName ?? '').trim().slice(0, MAX_NICKNAME)
        if (!saved || (!p.nickname && fromAccount)) {
          p = { ...p, nickname: p.nickname || fromAccount }
          await storage.saveProfile(p)
        }
        const s = await storage.getAppSettings(u.userId)
        const lv: Record<string, number> = {}
        for (const g of GAMES) {
          const gs = await storage.getGameSettings(u.userId, g.id)
          lv[g.id] = gs?.level ?? g.defaultLevel
        }
        return { p, s, lv }
      }

      const apply = ({ p, s, lv }: Awaited<ReturnType<typeof loadLocal>>) => {
        setProfile(p)
        setSettings(s)
        setLevels(lv)
        setUser(u)
      }

      if (cancelled) return
      apply(await loadLocal())
      track('app_open', { userId: u.userId })

      // 서버 동기화는 화면을 띄운 뒤 뒤에서 진행한다.
      // 여기서 기다리면 비행기모드·지하철·Supabase 일시정지 때 첫 화면이 안 뜬다.
      if (u.provider !== 'anonymous') {
        void (async () => {
          const gameIds = GAMES.map((g) => g.id)
          try {
            // 첫 로그인이면 이 기기의 익명 기록을 계정으로 병합하고, 서버 기록과 동기화
            await storage.migrateFrom(peekAnonymousUserId(), u.userId, gameIds)
            await storage.syncDown(u.userId, gameIds)
          } catch (e) {
            console.warn('cloud sync skipped', e)
          }
          if (cancelled) return
          apply(await loadLocal()) // 서버에서 내려온 기록을 화면에 반영
        })()
      }
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

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'nickname'>>) => {
      if (!user || !profile) return
      const next: Profile = { ...profile, ...patch }
      if (typeof next.nickname === 'string') next.nickname = next.nickname.trim().slice(0, MAX_NICKNAME)
      setProfile(next)
      await storage.saveProfile(next)
      track('profile_change', { nickname: next.nickname.length })
    },
    [user, profile, storage],
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
      signIn: () => getAuth().signIn(),
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
    // 기록만 지우고 계정 이름은 되살려둔다 (다시 입력하게 만들지 않기 위해)
    const fresh: Profile = {
      userId: user.userId,
      nickname: (user.displayName ?? '').trim().slice(0, MAX_NICKNAME),
      createdAt: new Date().toISOString(),
    }
    await storage.saveProfile(fresh)
    setProfile(fresh)
    setSettings(DEFAULT_APP_SETTINGS)
    const lv: Record<string, number> = {}
    for (const g of GAMES) lv[g.id] = g.defaultLevel
    setLevels(lv)
  }, [user, storage])

  if (!user || !profile) return <>{fallback}</>

  return (
    <Ctx.Provider value={{ user, storage, profile, updateProfile, settings, updateSettings, levels, setLevel, resetAll, cloud }}>
      {children}
    </Ctx.Provider>
  )
}
