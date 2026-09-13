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
import { pickRandomGameId } from '../engine/pickGame'
import { compareWithPast } from '../engine/compare'
import { buildWeekly, weeklyMax, weeklySummary } from '../engine/weekly'

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


describe('무작위 게임 고르기', () => {
  const ids = ['a', 'b', 'c', 'd']

  it('오늘 안 한 게임 중에서만 고른다', () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickRandomGameId(ids, { doneToday: ['a', 'b'], random: () => i / 20 })
      expect(['c', 'd']).toContain(picked)
    }
  })

  it('오늘 전부 했으면 전체에서 고른다', () => {
    const picked = pickRandomGameId(ids, { doneToday: ids, random: () => 0.5 })
    expect(ids).toContain(picked)
  })

  it('직전에 한 게임은 안 고른다', () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickRandomGameId(ids, { lastPlayedId: 'c', random: () => i / 20 })
      expect(picked).not.toBe('c')
    }
  })

  it('남은 후보가 직전 게임뿐이면 그거라도 고른다', () => {
    const picked = pickRandomGameId(ids, { doneToday: ['a', 'b', 'd'], lastPlayedId: 'c', random: () => 0 })
    expect(picked).toBe('c')
  })

  it('random 이 1에 가까워도 배열 밖으로 안 나간다', () => {
    expect(pickRandomGameId(ids, { random: () => 0.999999 })).toBe('d')
    expect(pickRandomGameId(ids, { random: () => 1 })).toBe('d')
  })

  it('게임이 없으면 null', () => {
    expect(pickRandomGameId([])).toBeNull()
  })

  it('등록된 게임 전부가 언젠가는 뽑힌다', () => {
    const all = GAMES.map((g) => g.id)
    const seen = new Set<string>()
    for (let i = 0; i < all.length; i++) seen.add(pickRandomGameId(all, { random: () => i / all.length })!)
    expect(seen.size).toBe(all.length)
  })
})


/* ---------- 지난번의 나와 비교 ---------- */

const NOW = Date.parse('2026-09-13T12:00:00.000Z')
const rec = (o: { points: number; correct: number; total: number; agoDays?: number }) => ({
  id: 'x' + Math.random(),
  userId: 'u',
  gameId: 'quick-math',
  startedAt: new Date(NOW - (o.agoDays ?? 0) * 86400000).toISOString(),
  durationMs: 60000,
  levelStart: 2,
  levelEnd: 2,
  correct: o.correct,
  total: o.total,
  points: o.points,
})

describe('지난번과 비교', () => {
  it('이전 기록이 없으면 아무 말도 안 한다', () => {
    expect(compareWithPast({ points: 100, correct: 8, total: 10 }, [], NOW)).toEqual({ tone: 'none', text: '' })
  })

  it('문제 수가 같으면 맞힌 문제 수로 비교한다', () => {
    const c = compareWithPast({ points: 140, correct: 9, total: 10 }, [rec({ points: 100, correct: 7, total: 10 })], NOW)
    expect(c.tone).toBe('up')
    expect(c.text).toContain('2문제')
  })

  it('문제 수가 다르면(시간제 게임) 점수로 비교한다', () => {
    const c = compareWithPast({ points: 180, correct: 12, total: 14 }, [rec({ points: 150, correct: 10, total: 11 })], NOW)
    expect(c.tone).toBe('up')
    expect(c.text).toContain('30점')
  })

  it('똑같으면 꾸준함을 칭찬한다', () => {
    const c = compareWithPast({ points: 100, correct: 7, total: 10 }, [rec({ points: 100, correct: 7, total: 10 })], NOW)
    expect(c.tone).toBe('same')
  })

  it('내려가도 나무라지 않는다', () => {
    const c = compareWithPast({ points: 60, correct: 5, total: 10 }, [rec({ points: 100, correct: 8, total: 10 })], NOW)
    expect(c.tone).toBe('down')
    expect(c.text).toContain('3문제')
    // 부정적인 단어가 들어가면 안 됨
    for (const bad of ['못', '실패', '나빠', '떨어졌']) expect(c.text).not.toContain(bad)
    // 폴드 화면에서 두 줄로 넘어가지 않게 짧게 유지
    expect(c.text.length).toBeLessThanOrEqual(16)
  })

  it('기록이 3판 미만이면 주간 평균은 말하지 않는다', () => {
    const past = [rec({ points: 100, correct: 7, total: 10 }), rec({ points: 90, correct: 6, total: 10, agoDays: 1 })]
    expect(compareWithPast({ points: 120, correct: 8, total: 10 }, past, NOW).detail).toBeUndefined()
  })

  it('최근 7일 평균은 7일 안쪽 기록만으로 낸다', () => {
    const past = [
      rec({ points: 100, correct: 7, total: 10, agoDays: 1 }),
      rec({ points: 100, correct: 7, total: 10, agoDays: 2 }),
      rec({ points: 100, correct: 7, total: 10, agoDays: 3 }),
      rec({ points: 9999, correct: 10, total: 10, agoDays: 30 }), // 오래된 판은 빠져야 함
    ]
    const c = compareWithPast({ points: 200, correct: 9, total: 10 }, past, NOW)
    expect(c.detail).toBe('최근 7일 평균 100점보다 높아요 👍')
  })

  it('평균과 10% 안쪽이면 비슷하다고 한다', () => {
    const past = [
      rec({ points: 100, correct: 7, total: 10, agoDays: 1 }),
      rec({ points: 100, correct: 7, total: 10, agoDays: 2 }),
      rec({ points: 100, correct: 7, total: 10, agoDays: 3 }),
    ]
    expect(compareWithPast({ points: 105, correct: 7, total: 10 }, past, NOW).detail).toContain('비슷해요')
  })
})

/* ---------- 주간 그래프 ---------- */

describe('주간 집계', () => {
  const today = '2026-09-13'
  const at = (day: string, points: number) => ({
    id: 'w' + day + points, userId: 'u', gameId: 'stroop',
    startedAt: `${day}T09:00:00.000Z`, durationMs: 60000,
    levelStart: 1, levelEnd: 1, correct: 5, total: 6, points,
  })

  it('오늘이 맨 오른쪽인 7칸을 만든다', () => {
    const week = buildWeekly([], today)
    expect(week).toHaveLength(7)
    expect(week[6].key).toBe(today)
    expect(week[6].isToday).toBe(true)
    expect(week[0].key).toBe('2026-09-07')
    expect(week.filter((d) => d.isToday)).toHaveLength(1)
  })

  it('같은 날 여러 판은 점수를 더한다', () => {
    const week = buildWeekly([at(today, 120), at(today, 80)], today)
    expect(week[6].points).toBe(200)
    expect(week[6].plays).toBe(2)
  })

  it('7일 밖 기록은 어느 칸에도 안 들어간다', () => {
    const week = buildWeekly([at('2026-08-01', 500)], today)
    expect(week.every((d) => d.points === 0)).toBe(true)
  })

  it('안 한 날은 0', () => {
    const week = buildWeekly([at('2026-09-11', 300)], today)
    expect(week.find((d) => d.key === '2026-09-11')!.points).toBe(300)
    expect(week.find((d) => d.key === '2026-09-12')!.points).toBe(0)
  })

  it('전부 0이어도 0으로 나누지 않는다', () => {
    expect(weeklyMax(buildWeekly([], today))).toBe(1)
  })

  it('요약 문구', () => {
    expect(weeklySummary(buildWeekly([], today))).toContain('아직 기록이 없어요')
    const week = buildWeekly([at(today, 120), at('2026-09-11', 80)], today)
    expect(weeklySummary(week)).toBe('최근 7일 중 2일 운동 · 모두 200점')
  })
})
