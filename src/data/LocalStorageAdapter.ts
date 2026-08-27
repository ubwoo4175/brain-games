import type { StorageAdapter } from './StorageAdapter'
import { DEFAULT_APP_SETTINGS, type AppSettings, type GameSettings, type Profile, type SessionRecord } from './types'

const PREFIX = 'bg:v1'
const MAX_SESSIONS = 2000

function key(...parts: string[]) {
  return [PREFIX, ...parts].join(':')
}

function read<T>(k: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(k: string, value: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch (e) {
    console.warn('localStorage write failed', e)
  }
}

/**
 * 브라우저 localStorage 기반 저장소.
 * 용량 걱정 없는 소규모 데이터(세션 기록 최대 2000건)라 IndexedDB 대신 단순하게 갑니다.
 */
export class LocalStorageAdapter implements StorageAdapter {
  async getProfile(userId: string) {
    return read<Profile | null>(key('profile', userId), null)
  }
  async saveProfile(profile: Profile) {
    write(key('profile', profile.userId), profile)
  }

  async getGameSettings(userId: string, gameId: string) {
    return read<GameSettings | null>(key('game', userId, gameId), null)
  }
  async saveGameSettings(settings: GameSettings) {
    write(key('game', settings.userId, settings.gameId), settings)
  }

  async saveSession(record: SessionRecord) {
    const k = key('sessions', record.userId)
    const list = read<SessionRecord[]>(k, [])
    list.unshift(record)
    if (list.length > MAX_SESSIONS) list.length = MAX_SESSIONS
    write(k, list)
  }
  /** 동기화 병합용: 세션 목록을 통째로 교체 (최신순으로 저장) */
  async replaceSessions(userId: string, sessions: SessionRecord[]) {
    const sorted = [...sessions].sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    if (sorted.length > MAX_SESSIONS) sorted.length = MAX_SESSIONS
    write(key('sessions', userId), sorted)
  }

  async listSessions(userId: string, gameId?: string, limit = 100) {
    const list = read<SessionRecord[]>(key('sessions', userId), [])
    const filtered = gameId ? list.filter((s) => s.gameId === gameId) : list
    return filtered.slice(0, limit)
  }

  async getAppSettings(userId: string) {
    return { ...DEFAULT_APP_SETTINGS, ...read<Partial<AppSettings>>(key('app', userId), {}) }
  }
  async saveAppSettings(userId: string, settings: AppSettings) {
    write(key('app', userId), settings)
  }

  async clearAll(userId: string) {
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && k.includes(`:${userId}`)) toRemove.push(k)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  }
}
