export type ColorId = 'red' | 'blue' | 'green' | 'yellow'

export const COLOR_INFO: Record<ColorId, { label: string; ink: string; swatch: string }> = {
  red: { label: '빨강', ink: '#d32f2f', swatch: '#ef5350' },
  blue: { label: '파랑', ink: '#1d4ed8', swatch: '#42a5f5' },
  green: { label: '초록', ink: '#15803d', swatch: '#66bb6a' },
  yellow: { label: '노랑', ink: '#ca8a04', swatch: '#fdd835' },
}

export const COLOR_IDS: ColorId[] = ['red', 'blue', 'green', 'yellow']

/** 무엇을 고르라고 묻나: ink = 글자의 색깔, word = 글자의 뜻 */
export type StroopAsk = 'ink' | 'word'

export interface StroopRound {
  /** 화면에 쓰여 있는 색 이름 */
  word: ColorId
  /** 글자가 칠해진 색 */
  ink: ColorId
  ask: StroopAsk
}

export function stroopAnswer(round: StroopRound): ColorId {
  return round.ask === 'ink' ? round.ink : round.word
}
