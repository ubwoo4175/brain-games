/** 버튼 번호 0~3 */
export type SimonPad = 0 | 1 | 2 | 3

export const PAD_INFO: { label: string; color: string; press: string; note: number }[] = [
  { label: '빨강', color: '#ef5350', press: '#ffcdd2', note: 261.6 }, // 도
  { label: '파랑', color: '#42a5f5', press: '#bbdefb', note: 329.6 }, // 미
  { label: '초록', color: '#66bb6a', press: '#c8e6c9', note: 392.0 }, // 솔
  { label: '노랑', color: '#fdd835', press: '#fff9c4', note: 523.3 }, // 높은 도
]

export interface SimonRound {
  /** 이 순서대로 불이 켜진다. 그대로 따라 누르면 정답 */
  seq: SimonPad[]
}
