export interface QuickMathRound {
  /** 화면에 보이는 식 (예: "7 + 8") */
  text: string
  answer: number
  /** 4지선다 (정답 포함, 섞여 있음) */
  choices: number[]
}
