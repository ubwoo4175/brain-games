export type Hand = 'rock' | 'scissors' | 'paper'
export type Rule = 'lose' | 'win'

export interface LosingRpsRound {
  shown: Hand
  rule: Rule
  timeLimitMs: number
}

export const HAND_INFO: Record<Hand, { emoji: string; label: string }> = {
  rock: { emoji: '✊', label: '바위' },
  scissors: { emoji: '✌️', label: '가위' },
  paper: { emoji: '🖐️', label: '보' },
}

/** a 가 b 를 이기는가 */
export function beats(a: Hand, b: Hand): boolean {
  return (a === 'rock' && b === 'scissors') || (a === 'scissors' && b === 'paper') || (a === 'paper' && b === 'rock')
}

export function isCorrectPick(shown: Hand, rule: Rule, pick: Hand): boolean {
  return rule === 'lose' ? beats(shown, pick) : beats(pick, shown)
}
