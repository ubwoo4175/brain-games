import type { Rng } from '../../shared/rng'
import { WORDS, type WordEntry } from './data/words'
import type { ChosungRound } from './types'

const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ']

/** 한글 문자열 → 초성 문자열. 한글이 아닌 글자(띄어쓰기 등)는 그대로. */
export function toChosung(word: string): string {
  let out = ''
  for (const ch of word) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) {
      out += CHO[Math.floor((code - 0xac00) / 588)]
    } else {
      out += ch
    }
  }
  return out
}

/** 띄어쓰기 제외 글자 수 */
function syllables(word: string): number {
  return word.replace(/\s/g, '').length
}

interface LevelConfig {
  /** 어떤 단어 풀에서 뽑나 */
  pool: (e: WordEntry) => boolean
  hint: boolean
  choices: number
  label: string
}

const IDIOM = (e: WordEntry) => e.c === '사자성어'
const PROVERB = (e: WordEntry) => e.c === '속담'
const PLAIN = (n: number) => (e: WordEntry) => !IDIOM(e) && !PROVERB(e) && syllables(e.w) === n

export const LEVELS: Record<number, LevelConfig> = {
  1: { pool: PLAIN(2), hint: true, choices: 3, label: '두 글자 · 힌트 있음' },
  2: { pool: PLAIN(2), hint: true, choices: 4, label: '두 글자 · 보기 4개' },
  3: { pool: PLAIN(3), hint: true, choices: 4, label: '세 글자 · 힌트 있음' },
  4: { pool: PLAIN(2), hint: false, choices: 4, label: '두 글자 · 힌트 없음' },
  5: { pool: PLAIN(3), hint: false, choices: 4, label: '세 글자 · 힌트 없음' },
  6: { pool: IDIOM, hint: true, choices: 4, label: '사자성어 · 힌트 있음' },
  7: { pool: IDIOM, hint: false, choices: 4, label: '사자성어 · 힌트 없음' },
  8: { pool: PROVERB, hint: false, choices: 4, label: '속담' },
}

export function makeChosungRound(level: number, rng: Rng, previous?: ChosungRound): ChosungRound {
  const cfg = LEVELS[level] ?? LEVELS[1]
  const used = previous?.used ?? []
  const pool = WORDS.filter(cfg.pool)
  let candidates = pool.filter((e) => !used.includes(e.w))
  if (candidates.length === 0) candidates = pool // 다 썼으면 처음부터

  const target = rng.pick(candidates)
  const chosung = toChosung(target.w)

  // 오답 보기: 같은 분류 + 같은 글자 수 우선, 부족하면 같은 글자 수 아무 단어.
  // 정답과 초성이 같은 단어는 제외 (답이 둘이 되면 안 됨).
  // 사자성어·속담은 길이가 제각각이라 같은 분류면 길이 무관.
  const special = IDIOM(target) || PROVERB(target)
  const ok = (e: WordEntry) => e.w !== target.w && toChosung(e.w) !== chosung && (special ? e.c === target.c : !IDIOM(e) && !PROVERB(e))
  const sameLen = (e: WordEntry) => ok(e) && (special || syllables(e.w) === syllables(target.w))
  const primary = WORDS.filter((e) => sameLen(e) && e.c === target.c)
  const secondary = WORDS.filter((e) => sameLen(e) && e.c !== target.c)
  const distractors: string[] = []
  for (const e of rng.shuffle(primary)) {
    if (distractors.length >= cfg.choices - 1) break
    distractors.push(e.w)
  }
  for (const e of rng.shuffle(secondary)) {
    if (distractors.length >= cfg.choices - 1) break
    distractors.push(e.w)
  }

  return {
    chosung,
    answer: target.w,
    hint: cfg.hint ? target.c : null,
    choices: rng.shuffle([target.w, ...distractors]),
    used: [...used, target.w],
  }
}
