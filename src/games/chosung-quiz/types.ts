export interface ChosungRound {
  chosung: string
  answer: string
  /** 힌트(분류). 없으면 힌트 없이 출제 */
  hint: string | null
  choices: string[]
  /** 이번 세션에서 이미 나온 단어 (다음 문제 생성 시 중복 방지용으로 이어짐) */
  used: string[]
}
