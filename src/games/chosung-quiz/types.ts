export interface ChosungRound {
  chosung: string
  answer: string
  /** 힌트(분류). 없으면 힌트 없이 출제 */
  hint: string | null
  choices: string[]
  /** 그림 보기 레벨: choices와 같은 순서의 이모지. 단어 레벨이면 null */
  emojis: string[] | null
  /** 이번 세션에서 이미 나온 단어 (다음 문제 생성 시 중복 방지용으로 이어짐) */
  used: string[]
}
