import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../shared/supabase'
import { LocalStorageAdapter } from './LocalStorageAdapter'
import type { StorageAdapter } from './StorageAdapter'
import { mergeSessions, pickNewerGameSettings } from './sync'
import { DEFAULT_APP_SETTINGS, type AppSettings, type GameSettings, type Profile, type SessionRecord } from './types'

const QUEUE_KEY = 'bg:v1:syncQueue'
const MIGRATED_PREFIX = 'bg:v1:migrated'

/** 서버로 밀어올릴 작업 하나 (upsert 만 쓰므로 재시도해도 안전) */
interface QueueItem {
  table: 'profiles' | 'game_settings' | 'sessions' | 'app_settings'
  row: Record<string, unknown>
}

/* ---------- 모델 ↔ 테이블(snake_case) 변환 ---------- */

const toSessionRow = (s: SessionRecord) => ({
  id: s.id,
  user_id: s.userId,
  game_id: s.gameId,
  started_at: s.startedAt,
  duration_ms: s.durationMs,
  level_start: s.levelStart,
  level_end: s.levelEnd,
  correct: s.correct,
  total: s.total,
  points: s.points,
  details: s.details ?? {},
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fromSessionRow = (r: any): SessionRecord => ({
  id: r.id,
  userId: r.user_id,
  gameId: r.game_id,
  startedAt: r.started_at,
  durationMs: r.duration_ms,
  levelStart: r.level_start,
  levelEnd: r.level_end,
  correct: r.correct,
  total: r.total,
  points: r.points,
  details: r.details ?? undefined,
})

/**
 * 로컬 우선 + 백그라운드 동기화 저장소.
 * - 모든 읽기/쓰기는 LocalStorageAdapter 로 즉시 처리 → 오프라인에서도 게임이 그대로 된다.
 * - 카카오 로그인 상태(= 기록의 userId 가 Supabase 세션의 uid)면 쓰기를 서버에도 upsert.
 *   실패하면 큐에 쌓아뒀다가 온라인이 되면 다시 보낸다.
 * - syncDown(): 앱 시작 시 서버 기록을 받아 로컬과 병합하고, 로컬에만 있는 것은 올린다.
 * - migrateFrom(): 첫 로그인 때 이 기기의 익명 기록을 계정으로 옮긴다 (기기당 1회).
 */
export class SupabaseSyncAdapter implements StorageAdapter {
  private local = new LocalStorageAdapter()

  /* ---------- 큐 (직렬화 실패는 조용히 무시 — 다음 쓰기 때 다시 시도됨) ---------- */

  private readQueue(): QueueItem[] {
    try {
      const raw = localStorage.getItem(QUEUE_KEY)
      return raw ? (JSON.parse(raw) as QueueItem[]) : []
    } catch {
      return []
    }
  }
  private writeQueue(items: QueueItem[]) {
    try {
      if (items.length === 0) localStorage.removeItem(QUEUE_KEY)
      else localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 500)))
    } catch {
      /* 저장 실패 시 이번 항목은 유실되지만 로컬 기록은 남아 syncDown 이 복구 */
    }
  }

  /** 로그인한 사용자의 데이터일 때만 서버로 보낸다 (익명 uuid 는 서버에 못 올림 — RLS) */
  private async cloudFor(userId: string): Promise<SupabaseClient | null> {
    const sb = getSupabase()
    if (!sb) return null
    const { data } = await sb.auth.getSession()
    return data.session?.user.id === userId ? sb : null
  }

  private conflictKey(table: QueueItem['table']): string {
    switch (table) {
      case 'sessions':
        return 'id'
      case 'game_settings':
        return 'user_id,game_id'
      default:
        return 'user_id'
    }
  }

  private async pushOne(sb: SupabaseClient, item: QueueItem): Promise<boolean> {
    const { error } = await sb.from(item.table).upsert(item.row, { onConflict: this.conflictKey(item.table) })
    if (error) console.warn('sync push failed', item.table, error.message)
    return !error
  }

  /** 쓰기 한 건을 서버로. 실패하면 큐에 넣는다. 기다리지 않아도 되는 호출부를 위해 fire-and-forget. */
  private push(userId: string, item: QueueItem) {
    void (async () => {
      const sb = await this.cloudFor(userId)
      if (!sb) return
      const ok = await this.pushOne(sb, item)
      if (!ok) this.writeQueue([...this.readQueue(), item])
      else void this.flushQueue(userId)
    })()
  }

  /** 큐에 쌓인 실패분 재전송 (앱 시작·온라인 복귀·성공한 쓰기 뒤에 호출) */
  async flushQueue(userId: string): Promise<void> {
    const queue = this.readQueue()
    if (queue.length === 0) return
    const sb = await this.cloudFor(userId)
    if (!sb) return
    const remain: QueueItem[] = []
    for (const item of queue) {
      if (!(await this.pushOne(sb, item))) remain.push(item)
    }
    this.writeQueue(remain)
  }

  /* ---------- StorageAdapter 구현 (읽기는 전부 로컬) ---------- */

  async getProfile(userId: string) {
    return this.local.getProfile(userId)
  }
  async saveProfile(profile: Profile) {
    await this.local.saveProfile(profile)
    this.push(profile.userId, {
      table: 'profiles',
      row: { user_id: profile.userId, nickname: profile.nickname, created_at: profile.createdAt },
    })
  }

  async getGameSettings(userId: string, gameId: string) {
    return this.local.getGameSettings(userId, gameId)
  }
  async saveGameSettings(settings: GameSettings) {
    await this.local.saveGameSettings(settings)
    this.push(settings.userId, {
      table: 'game_settings',
      row: { user_id: settings.userId, game_id: settings.gameId, level: settings.level, updated_at: settings.updatedAt },
    })
  }

  async saveSession(record: SessionRecord) {
    await this.local.saveSession(record)
    this.push(record.userId, { table: 'sessions', row: toSessionRow(record) })
  }
  async listSessions(userId: string, gameId?: string, limit?: number) {
    return this.local.listSessions(userId, gameId, limit)
  }

  async getAppSettings(userId: string) {
    return this.local.getAppSettings(userId)
  }
  async saveAppSettings(userId: string, settings: AppSettings) {
    await this.local.saveAppSettings(userId, settings)
    this.push(userId, {
      table: 'app_settings',
      row: { user_id: userId, settings, updated_at: new Date().toISOString() },
    })
  }

  async clearAll(userId: string) {
    await this.local.clearAll(userId)
    this.writeQueue([])
    const sb = await this.cloudFor(userId)
    if (sb) {
      // 서버 기록도 함께 삭제 (설정 화면의 "모든 기록 지우기")
      for (const table of ['sessions', 'game_settings', 'app_settings', 'profiles'] as const) {
        const { error } = await sb.from(table).delete().eq('user_id', userId)
        if (error) console.warn('cloud clear failed', table, error.message)
      }
    }
  }

  /* ---------- 동기화 ---------- */

  /** 서버 → 로컬 병합 후, 로컬에만 있는 기록을 서버로. 로그인 상태에서 앱 시작 시 호출. */
  async syncDown(userId: string, gameIds: string[]): Promise<void> {
    const sb = await this.cloudFor(userId)
    if (!sb) return

    // 세션: 합집합
    const [{ data: remoteSessions, error: sErr }, localSessions] = await Promise.all([
      sb.from('sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false }).limit(2000),
      this.local.listSessions(userId, undefined, 2000),
    ])
    if (!sErr && remoteSessions) {
      const remote = remoteSessions.map(fromSessionRow)
      const merged = mergeSessions(localSessions, remote)
      await this.local.replaceSessions(userId, merged)
      // 서버에 없는 것 업로드
      const remoteIds = new Set(remote.map((s) => s.id))
      const missing = merged.filter((s) => !remoteIds.has(s.id))
      for (const s of missing) await this.pushOne(sb, { table: 'sessions', row: toSessionRow(s) })
    }

    // 게임 설정(레벨): 최신 updatedAt 이 이김
    const { data: remoteGs, error: gErr } = await sb.from('game_settings').select('*').eq('user_id', userId)
    if (!gErr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const remoteByGame = new Map<string, GameSettings>((remoteGs ?? []).map((r: any) => [r.game_id, { userId: r.user_id, gameId: r.game_id, level: r.level, updatedAt: r.updated_at }]))
      for (const gameId of gameIds) {
        const localGs = await this.local.getGameSettings(userId, gameId)
        const winner = pickNewerGameSettings(localGs, remoteByGame.get(gameId) ?? null)
        if (!winner) continue
        if (winner !== localGs) await this.local.saveGameSettings(winner)
        if (winner !== remoteByGame.get(gameId)) {
          await this.pushOne(sb, {
            table: 'game_settings',
            row: { user_id: userId, game_id: winner.gameId, level: winner.level, updated_at: winner.updatedAt },
          })
        }
      }
    }

    // 앱 설정: 서버에 있으면 서버 것, 없으면 로컬 것을 업로드
    const { data: remoteApp } = await sb.from('app_settings').select('settings').eq('user_id', userId).maybeSingle()
    if (remoteApp?.settings) {
      await this.local.saveAppSettings(userId, { ...DEFAULT_APP_SETTINGS, ...(remoteApp.settings as Partial<AppSettings>) })
    } else {
      const localApp = await this.local.getAppSettings(userId)
      await this.pushOne(sb, { table: 'app_settings', row: { user_id: userId, settings: localApp, updated_at: new Date().toISOString() } })
    }

    await this.flushQueue(userId)
  }

  /** 이 기기의 익명 기록을 로그인 계정으로 병합 (기기당 계정마다 1회) */
  async migrateFrom(anonymousUserId: string | null, userId: string, gameIds: string[]): Promise<void> {
    if (!anonymousUserId || anonymousUserId === userId) return
    const flag = `${MIGRATED_PREFIX}:${anonymousUserId}:${userId}`
    try {
      if (localStorage.getItem(flag)) return
    } catch {
      return
    }

    // 세션: userId 만 바꿔 계정 쪽 로컬 기록으로 복사 (id 유지 → 서버에서도 중복 없음)
    const anonSessions = await this.local.listSessions(anonymousUserId, undefined, 2000)
    for (const s of [...anonSessions].reverse()) await this.saveSession({ ...s, userId })

    // 레벨: 등록된 모든 게임에 대해 더 최신 것만
    for (const gameId of gameIds) {
      const anonGs = await this.local.getGameSettings(anonymousUserId, gameId)
      const mine = await this.local.getGameSettings(userId, gameId)
      const winner = pickNewerGameSettings(mine, anonGs ? { ...anonGs, userId } : null)
      if (winner) await this.saveGameSettings(winner)
    }

    // 앱 설정: 계정 쪽에 아직 없으면 익명 것을 가져옴
    const anonApp = await this.local.getAppSettings(anonymousUserId)
    await this.saveAppSettings(userId, anonApp)

    try {
      localStorage.setItem(flag, new Date().toISOString())
    } catch {
      /* 플래그 저장 실패 시 다음 실행에 한 번 더 병합해도 upsert 라 안전 */
    }
  }
}
