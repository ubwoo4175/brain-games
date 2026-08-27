import type { AnyGame } from '../engine/types'
import { chosungQuiz } from './chosung-quiz'
import { digitSpan } from './digit-span'
import { losingRps } from './losing-rps'
import { quickMath } from './quick-math'

/**
 * ★ 게임 등록 목록 ★
 * 새 게임을 만들면 여기에 한 줄 추가하세요. 홈 화면 카드, 통계, 설정이 자동으로 생깁니다.
 * 순서 = 홈 화면에 보이는 순서.
 */
export const GAMES: AnyGame[] = [digitSpan, losingRps, quickMath, chosungQuiz]

export function getGame(id: string): AnyGame | undefined {
  return GAMES.find((g) => g.id === id)
}
