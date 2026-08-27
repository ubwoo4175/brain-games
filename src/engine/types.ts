import type { ComponentType } from 'react'
import type { Rng } from '../shared/rng'

/** 인지 영역 — 홈 화면 표시와 통계 분류에 사용 */
export type CognitiveDomain = 'memory' | 'inhibition' | 'calculation' | 'language' | 'attention' | 'speed' | 'visuospatial'

export const DOMAIN_LABEL: Record<CognitiveDomain, string> = {
  memory: '기억력',
  inhibition: '순발력',
  calculation: '계산력',
  language: '언어력',
  attention: '주의력',
  speed: '처리속도',
  visuospatial: '시공간',
}

/** 세션 진행 방식: 문제 N개 풀기 또는 N초 동안 최대한 많이 */
export type SessionMode = { kind: 'rounds'; count: number } | { kind: 'timed'; seconds: number }

/** 적응 난이도 규칙: 연속 정답 upAfter회 → 레벨+1, 연속 오답 downAfter회 → 레벨-1 */
export interface AdaptiveRule {
  upAfter: number
  downAfter: number
}

export const DEFAULT_ADAPTIVE: AdaptiveRule = { upAfter: 3, downAfter: 2 }

/** 게임이 한 문제의 답을 제출할 때 넘기는 값 */
export interface AnswerInput {
  correct: boolean
  /** 제한시간 초과로 끝난 경우 */
  timedOut?: boolean
  /** 통계/디버깅용 (자유 형식) */
  answer?: unknown
}

/** 엔진이 기록하는 한 문제의 결과 */
export interface RoundResult extends AnswerInput {
  level: number
  responseMs: number
}

export interface SessionScore {
  correct: number
  total: number
  accuracy: number // 0~1
  points: number
  avgResponseMs: number
}

/** 각 게임의 문제 화면(RoundView)이 받는 props */
export interface RoundViewProps<R> {
  round: R
  level: number
  /** 문제 번호 (0부터) */
  roundIndex: number
  /** 답 제출. 호출 즉시 엔진이 정답/오답 피드백을 띄우고 다음 문제로 넘어감. 한 문제에 한 번만 호출. */
  onAnswer: (input: AnswerInput) => void
  /** 앱 설정 중 게임이 알아야 하는 것 */
  settings: { sound: boolean; vibration: boolean }
}

/**
 * ★ 게임 플러그인 인터페이스 ★
 * 새 게임 = 이 인터페이스를 구현한 객체 하나 + games/index.ts 에 등록.
 *
 * 규칙:
 * - makeRound 는 순수 함수여야 함 (난수는 반드시 rng 사용). → 테스트/재현 가능.
 * - RoundView 는 문제 하나만 책임짐. 점수/진행/피드백/저장은 엔진이 함.
 * - 레벨은 minLevel~maxLevel 정수. 레벨이 오를수록 어려워야 함.
 */
export interface GameDefinition<R = unknown> {
  /** 영문 소문자-하이픈. 저장 키로 쓰이므로 한 번 정하면 바꾸지 말 것. */
  id: string
  title: string
  /** 홈 카드에 보이는 한 줄 설명 */
  subtitle: string
  /** 시작 화면 설명 (1~2문장, 쉬운 말로) */
  howTo: string
  /** 이모지 아이콘 */
  icon: string
  domain: CognitiveDomain
  /** 카드 배경색 (CSS color) */
  color: string

  minLevel: number
  maxLevel: number
  defaultLevel: number
  /** 레벨을 사람 말로: "숫자 5개", "1분에 몇 개" 등 */
  levelLabel?: (level: number) => string

  mode: SessionMode
  adaptive?: AdaptiveRule

  makeRound: (level: number, rng: Rng, ctx: { roundIndex: number; previous?: R }) => R
  RoundView: ComponentType<RoundViewProps<R>>
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyGame = GameDefinition<any>
