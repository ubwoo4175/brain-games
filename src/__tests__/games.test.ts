import { describe, expect, it } from 'vitest'
import { applyAdaptive } from '../engine/adaptive'
import { makeChosungRound, toChosung } from '../games/chosung-quiz/logic'
import { WORDS } from '../games/chosung-quiz/data/words'
import { makeQuickMathRound } from '../games/quick-math/logic'
import { isCorrectPick } from '../games/losing-rps/types'
import { losingRps } from '../games/losing-rps'
import { makeStroopRound } from '../games/stroop/logic'
import { stroopAnswer } from '../games/stroop/types'
import { makeCardMatchRound } from '../games/card-match/logic'
import { makeNumberTouchRound } from '../games/number-touch/logic'
import { makeSimonRound } from '../games/simon/logic'
import { makeOddOneOutRound } from '../games/odd-one-out/logic'
import { makeClockRound } from '../games/clock-quiz/logic'
import { formatTime } from '../games/clock-quiz/types'
import { GAMES } from '../games'
import { createRng } from '../shared/rng'
import { mergeSessions, pickNewerGameSettings } from '../data/sync'
import { evaluateGoal, makeDailyGoal } from '../engine/dailyGoal'

describe('초성', () => {
  it('한글 → 초성', () => {
    expect(toChosung('사과')).toBe('ㅅㄱ')
    expect(toChosung('누워서 떡 먹기')).toBe('ㄴㅇㅅ ㄸ ㅁㄱ')
  })
  it('모든 레벨에서 보기 개수가 맞고 정답이 포함되며 초성이 겹치지 않는다', () => {
    const rng = createRng(42)
    for (let level = 1; level <= 10; level++) {
      let prev
      for (let i = 0; i < 30; i++) {
        const r = makeChosungRound(level, rng, prev)
        expect(r.choices).toContain(r.answer)
        expect(new Set(r.choices).size).toBe(r.choices.length)
        expect(r.choices.length).toBe(level === 1 ? 3 : 4)
        for (const c of r.choices) if (c !== r.answer) expect(toChosung(c)).not.toBe(r.chosung)
        if (level === 6 || level === 7) {
          // 그림 보기 레벨: 보기마다 이모지가 있고 서로 다르다
          expect(r.emojis).not.toBeNull()
          expect(r.emojis!.length).toBe(r.choices.length)
          for (const e of r.emojis!) expect(e).not.toBe('')
          expect(new Set(r.emojis!).size).toBe(r.emojis!.length)
        } else {
          expect(r.emojis).toBeNull()
        }
        prev = r
      }
    }
  })
  it('단어 은행에 중복이 없다', () => {
    const set = new Set(WORDS.map((w) => w.w))
    expect(set.size).toBe(WORDS.length)
  })
  it('이모지 태그는 서로 다르고, 그림 레벨에 쓸 단어가 넉넉하다', () => {
    const tagged = WORDS.filter((w) => w.e)
    expect(new Set(tagged.map((w) => w.e)).size).toBe(tagged.length)
    const len = (w: string) => w.replace(/\s/g, '').length
    expect(tagged.filter((w) => len(w.w) === 2).length).toBeGreaterThanOrEqual(20)
    expect(tagged.filter((w) => len(w.w) === 3).length).toBeGreaterThanOrEqual(10)
  })
})

describe('암산', () => {
  it('보기 4개, 정답 포함, 음수 없음', () => {
    const rng = createRng(7)
    for (let level = 1; level <= 10; level++) {
      for (let i = 0; i < 50; i++) {
        const r = makeQuickMathRound(level, rng)
        expect(r.choices.length).toBe(4)
        expect(r.choices).toContain(r.answer)
        expect(new Set(r.choices).size).toBe(4)
        expect(r.answer).toBeGreaterThanOrEqual(0)
        if (level === 1) expect(r.answer).toBeLessThanOrEqual(10)
      }
    }
  })
})

describe('가위바위보', () => {
  it('지는 손 / 이기는 손 판정', () => {
    expect(isCorrectPick('rock', 'lose', 'scissors')).toBe(true)
    expect(isCorrectPick('rock', 'lose', 'paper')).toBe(false)
    expect(isCorrectPick('rock', 'win', 'paper')).toBe(true)
    expect(isCorrectPick('scissors', 'lose', 'paper')).toBe(true)
  })
  it('레벨 3까지는 버튼 순서 고정, 레벨 4부터 섞임', () => {
    const rng = createRng(11)
    const rounds = (lv: number) => Array.from({ length: 30 }, () => losingRps.makeRound(lv, rng, { roundIndex: 0 }))
    for (const r of rounds(3)) expect(r.order).toEqual(['scissors', 'rock', 'paper'])
    for (const r of rounds(4)) expect([...r.order].sort()).toEqual(['paper', 'rock', 'scissors'])
    expect(rounds(4).some((r) => r.order.join() !== 'scissors,rock,paper')).toBe(true)
  })
})

describe('스트룹', () => {
  it('ask에 따른 정답, 레벨 4는 전부 함정', () => {
    const rng = createRng(3)
    expect(stroopAnswer({ word: 'red', ink: 'blue', ask: 'ink' })).toBe('blue')
    expect(stroopAnswer({ word: 'red', ink: 'blue', ask: 'word' })).toBe('red')
    for (let i = 0; i < 50; i++) {
      const r = makeStroopRound(4, rng)
      expect(r.ink).not.toBe(r.word)
      expect(r.ask).toBe('ink')
    }
  })
})

describe('카드 짝 맞추기', () => {
  it('같은 그림이 정확히 두 장씩', () => {
    const rng = createRng(5)
    for (let lv = 1; lv <= 5; lv++) {
      const r = makeCardMatchRound(lv, rng)
      expect(r.cards.length).toBe(r.pairs * 2)
      const counts = new Map<string, number>()
      for (const c of r.cards) counts.set(c, (counts.get(c) ?? 0) + 1)
      for (const n of counts.values()) expect(n).toBe(2)
    }
  })
})

describe('숫자 순서 터치', () => {
  it('1부터 n까지 정확히 한 번씩 놓인다', () => {
    const rng = createRng(9)
    for (let lv = 1; lv <= 7; lv++) {
      const r = makeNumberTouchRound(lv, rng)
      const nums = r.cells.filter((c): c is number => c !== null).sort((a, b) => a - b)
      expect(nums).toEqual(Array.from({ length: r.n }, (_, i) => i + 1))
      expect(r.cells.length % r.cols).toBe(0)
    }
  })
})

describe('순서 기억', () => {
  it('레벨 = 순서 길이, 같은 버튼 3연속 없음', () => {
    const rng = createRng(13)
    for (let lv = 2; lv <= 8; lv++) {
      const r = makeSimonRound(lv, rng)
      expect(r.seq.length).toBe(lv)
      for (const p of r.seq) {
        expect(p).toBeGreaterThanOrEqual(0)
        expect(p).toBeLessThanOrEqual(3)
      }
      for (let i = 2; i < r.seq.length; i++) {
        expect(r.seq[i] === r.seq[i - 1] && r.seq[i] === r.seq[i - 2]).toBe(false)
      }
    }
  })
})

describe('다른 것 찾기', () => {
  it('다른 것 위치가 범위 안이고 깔린 것과 다르다', () => {
    const rng = createRng(17)
    for (let lv = 1; lv <= 6; lv++) {
      for (let i = 0; i < 30; i++) {
        const r = makeOddOneOutRound(lv, rng)
        expect(r.oddIndex).toBeGreaterThanOrEqual(0)
        expect(r.oddIndex).toBeLessThan(r.count)
        expect(r.base).not.toBe(r.odd)
        expect(r.count % r.cols).toBe(0)
      }
    }
  })
})

describe('시계 읽기', () => {
  it('보기 4개, 정답 포함, 중복 없음, 형식 일치', () => {
    const rng = createRng(21)
    let prev
    for (let lv = 1; lv <= 5; lv++) {
      for (let i = 0; i < 50; i++) {
        const r = makeClockRound(lv, rng, prev)
        expect(r.choices.length).toBe(4)
        expect(r.choices).toContain(r.answer)
        expect(new Set(r.choices).size).toBe(4)
        expect(r.answer).toBe(formatTime(r.time))
        expect(r.time.m % 5).toBe(0)
        if (lv === 1) expect(r.time.m).toBe(0)
        prev = r
      }
    }
  })
})

describe('적응 난이도', () => {
  it('연속 3정답 → +1, 연속 2오답 → -1, 범위 유지', () => {
    let s = { level: 1, correctStreak: 0, wrongStreak: 0 }
    const rule = { upAfter: 3, downAfter: 2 }
    for (let i = 0; i < 3; i++) s = applyAdaptive(s, true, rule, 1, 3).state
    expect(s.level).toBe(2)
    for (let i = 0; i < 2; i++) s = applyAdaptive(s, false, rule, 1, 3).state
    expect(s.level).toBe(1)
    s = applyAdaptive(s, false, rule, 1, 3).state
    s = applyAdaptive(s, false, rule, 1, 3).state
    expect(s.level).toBe(1)
  })
})

describe('게임 등록', () => {
  it('id 중복 없음, 레벨 범위 유효, 모든 레벨에서 문제 생성 가능', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(GAMES.length)
    const rng = createRng(1)
    for (const g of GAMES) {
      expect(g.defaultLevel).toBeGreaterThanOrEqual(g.minLevel)
      expect(g.defaultLevel).toBeLessThanOrEqual(g.maxLevel)
      for (let lv = g.minLevel; lv <= g.maxLevel; lv++) {
        expect(() => g.makeRound(lv, rng, { roundIndex: 0 })).not.toThrow()
      }
    }
  })
})

describe('동기화 병합', () => {
  const sess = (id: string, startedAt: string) => ({
    id,
    userId: 'u',
    gameId: 'g',
    startedAt,
    durationMs: 1000,
    levelStart: 1,
    levelEnd: 1,
    correct: 1,
    total: 1,
    points: 10,
  })
  it('세션은 id로 합집합, 최신순 정렬', () => {
    const a = [sess('1', '2026-01-02'), sess('2', '2026-01-01')]
    const b = [sess('2', '2026-01-01'), sess('3', '2026-01-03')]
    const m = mergeSessions(a, b)
    expect(m.map((s) => s.id)).toEqual(['3', '1', '2'])
  })
  it('게임 설정은 updatedAt 최신이 이김', () => {
    const old = { userId: 'u', gameId: 'g', level: 3, updatedAt: '2026-01-01' }
    const nu = { userId: 'u', gameId: 'g', level: 5, updatedAt: '2026-02-01' }
    expect(pickNewerGameSettings(old, nu)).toBe(nu)
    expect(pickNewerGameSettings(nu, old)).toBe(nu)
    expect(pickNewerGameSettings(null, old)).toBe(old)
    expect(pickNewerGameSettings(null, null)).toBeNull()
  })
})

describe('오늘의 목표', () => {
  const GAME_META = GAMES.map((g) => ({ id: g.id, domain: g.domain }))
  const rec = (day: string, gameId: string, points = 100, correct = 8, total = 10) => ({
    id: `${day}-${gameId}`,
    userId: 'u',
    gameId,
    startedAt: `${day}T09:00:00.000Z`,
    durationMs: 60000,
    levelStart: 1,
    levelEnd: 1,
    correct,
    total,
    points,
  })

  it('처음 며칠은 가장 쉬운 목표(게임 2가지)를 준다', () => {
    expect(makeDailyGoal('2026-09-09', [], GAME_META)).toEqual({ kind: 'games', target: 2 })
    const twoDays = [rec('2026-09-07', 'digit-span'), rec('2026-09-08', 'stroop')]
    expect(makeDailyGoal('2026-09-09', twoDays, GAME_META)).toEqual({ kind: 'games', target: 2 })
  })

  it('같은 날짜면 항상 같은 목표가 나온다', () => {
    const history = Array.from({ length: 10 }, (_, i) => rec(`2026-08-${String(10 + i).padStart(2, '0')}`, 'quick-math'))
    for (const day of ['2026-09-09', '2026-09-10', '2026-09-11']) {
      expect(makeDailyGoal(day, history, GAME_META)).toEqual(makeDailyGoal(day, history, GAME_META))
    }
  })

  it('모든 목표 종류가 오늘 기록으로 올바르게 채점된다', () => {
    const today = '2026-09-09'
    const todaySessions = [rec(today, 'digit-span', 120, 9, 10), rec(today, 'stroop', 80, 5, 10)]

    const games = evaluateGoal({ kind: 'games', target: 3 }, todaySessions, GAME_META, today)
    expect(games.detail).toBe('2 / 3가지')
    expect(games.done).toBe(false)
    expect(evaluateGoal({ kind: 'games', target: 2 }, todaySessions, GAME_META, today).done).toBe(true)

    const points = evaluateGoal({ kind: 'points', target: 200 }, todaySessions, GAME_META, today)
    expect(points.detail).toBe('200 / 200점')
    expect(points.done).toBe(true)

    const acc = evaluateGoal({ kind: 'accuracy', target: 70 }, todaySessions, GAME_META, today)
    expect(acc.done).toBe(true) // 9/10 = 90%
    expect(evaluateGoal({ kind: 'accuracy', target: 95 }, todaySessions, GAME_META, today).done).toBe(false)

    const memory = evaluateGoal({ kind: 'domain', domain: 'memory', target: 1 }, todaySessions, GAME_META, today)
    expect(memory.done).toBe(true) // digit-span 은 기억력
    expect(evaluateGoal({ kind: 'domain', domain: 'language', target: 1 }, todaySessions, GAME_META, today).done).toBe(false)
  })

  it('어제 기록은 오늘 진행률에 안 들어간다', () => {
    const g = evaluateGoal({ kind: 'games', target: 2 }, [rec('2026-09-08', 'digit-span')], GAME_META, '2026-09-09')
    expect(g.ratio).toBe(0)
    expect(g.done).toBe(false)
  })

  it('진행률은 0~1을 벗어나지 않는다', () => {
    const today = '2026-09-09'
    const many = [rec(today, 'digit-span', 5000, 10, 10)]
    expect(evaluateGoal({ kind: 'points', target: 100 }, many, GAME_META, today).ratio).toBe(1)
  })
})
