import { describe, expect, it } from 'vitest'
import { applyAdaptive } from '../engine/adaptive'
import { makeChosungRound, toChosung } from '../games/chosung-quiz/logic'
import { WORDS } from '../games/chosung-quiz/data/words'
import { makeQuickMathRound } from '../games/quick-math/logic'
import { isCorrectPick } from '../games/losing-rps/types'
import { GAMES } from '../games'
import { createRng } from '../shared/rng'

describe('초성', () => {
  it('한글 → 초성', () => {
    expect(toChosung('사과')).toBe('ㅅㄱ')
    expect(toChosung('누워서 떡 먹기')).toBe('ㄴㅇㅅ ㄸ ㅁㄱ')
  })
  it('모든 레벨에서 보기 개수가 맞고 정답이 포함되며 초성이 겹치지 않는다', () => {
    const rng = createRng(42)
    for (let level = 1; level <= 8; level++) {
      let prev
      for (let i = 0; i < 30; i++) {
        const r = makeChosungRound(level, rng, prev)
        expect(r.choices).toContain(r.answer)
        expect(new Set(r.choices).size).toBe(r.choices.length)
        expect(r.choices.length).toBe(level === 1 ? 3 : 4)
        for (const c of r.choices) if (c !== r.answer) expect(toChosung(c)).not.toBe(r.chosung)
        prev = r
      }
    }
  })
  it('단어 은행에 중복이 없다', () => {
    const set = new Set(WORDS.map((w) => w.w))
    expect(set.size).toBe(WORDS.length)
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
