export interface NumberTouchRound {
  /** 1부터 이 숫자까지 순서대로 누른다 */
  n: number
  /** 격자 칸마다 놓인 숫자. null이면 빈 칸 */
  cells: (number | null)[]
  /** 격자 열 수 */
  cols: number
}
