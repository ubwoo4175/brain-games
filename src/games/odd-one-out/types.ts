export interface OddOneOutRound {
  /** 깔려 있는 글자/숫자 */
  base: string
  /** 하나만 다른 글자/숫자 */
  odd: string
  /** 다른 것이 놓인 칸 (0부터) */
  oddIndex: number
  /** 전체 칸 수 */
  count: number
  /** 격자 열 수 */
  cols: number
}
