export interface ClockTime {
  /** 1~12시 */
  h: number
  /** 0~55분 (5분 단위) */
  m: number
}

export interface ClockRound {
  time: ClockTime
  /** "3시 40분" 형식의 보기들. 정답 포함, 섞인 순서 */
  choices: string[]
  answer: string
}

export function formatTime({ h, m }: ClockTime): string {
  return m === 0 ? `${h}시` : `${h}시 ${m}분`
}
