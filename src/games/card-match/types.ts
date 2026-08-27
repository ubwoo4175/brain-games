export interface CardMatchRound {
  /** 카드에 그려진 그림. 같은 그림이 정확히 두 장씩, 섞인 순서 그대로 배치 */
  cards: string[]
  /** 몇 쌍인가 */
  pairs: number
  /** 한 줄에 몇 장 */
  cols: number
  /** 시작할 때 전체 카드를 이만큼(ms) 보여준 뒤 뒤집는다. 0이면 바로 시작 */
  previewMs: number
}
