import type { ContentSource } from '../index'

const QUOTES = [
  '오늘도 두뇌 운동 하러 오셨네요. 대단해요!',
  '하루 5분이면 충분해요. 꾸준함이 최고의 보약.',
  '틀려도 괜찮아요. 머리는 틀릴 때 가장 많이 배워요.',
  '어제보다 한 문제만 더. 그게 발전이에요.',
  '물 한 잔 드시고 시작해요. 뇌도 물이 필요하대요.',
  '오늘 산책은 하셨나요? 걷기는 최고의 두뇌 운동이에요.',
  '웃으면 뇌가 좋아해요. 오늘 한 번 크게 웃어보세요.',
  '잠을 푹 자는 게 기억력에 제일 좋아요.',
  '천천히 해도 돼요. 정확하게 하는 게 더 중요해요.',
  '오늘 누구랑 이야기 나누셨어요? 대화도 두뇌 운동이에요.',
]

export const quotesSource: ContentSource = {
  id: 'quotes',
  pick(dateKey) {
    // 날짜별로 하나 고정 (하루 종일 같은 문구)
    let h = 0
    for (const ch of dateKey) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    const body = QUOTES[h % QUOTES.length]
    return { id: `quote-${h % QUOTES.length}`, kind: 'quote', body }
  },
}
