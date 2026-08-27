import { quotesSource } from './sources/quotes'

/**
 * 콘텐츠 슬롯 (인터스티셜).
 * 홈 화면 하단, 게임 결과 화면 등에 "한 장짜리 카드"를 보여주는 자리입니다.
 * 지금은 오늘의 한마디만 있지만, 나중에 협찬 카드(광고)를 같은 인터페이스로 넣고,
 * 그 카드 내용을 회상하는 문제(예: "아까 본 협찬 브랜드는?")를 퀴즈 엔진에 얹을 수 있습니다.
 */
export interface ContentCard {
  id: string
  kind: 'quote' | 'tip' | 'sponsor'
  title?: string
  body: string
  /** 회상 문제용 (나중에 사용): 정답과 오답 보기 */
  recall?: { question: string; answer: string; distractors: string[] }
}

export interface ContentSource {
  id: string
  /** 오늘 보여줄 카드 하나 (없으면 null) */
  pick(dateKey: string): ContentCard | null
}

const sources: ContentSource[] = [quotesSource]

export function pickContent(dateKey: string): ContentCard | null {
  for (const s of sources) {
    const c = s.pick(dateKey)
    if (c) return c
  }
  return null
}
