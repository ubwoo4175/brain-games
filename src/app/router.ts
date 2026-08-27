import { useCallback, useEffect, useState } from 'react'

/**
 * 아주 작은 해시 라우터. (#/ , #/game/quick-math , #/stats , #/settings)
 * - 해시를 쓰는 이유: GitHub Pages 같은 정적 호스팅에서 새로고침해도 404가 안 나고,
 *   안드로이드 "뒤로" 버튼이 앱을 닫지 않고 이전 화면으로 가게 됩니다.
 */
export type Route =
  | { name: 'home' }
  | { name: 'game'; gameId: string }
  | { name: 'stats' }
  | { name: 'settings' }

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const parts = path.split('/').filter(Boolean)
  if (parts[0] === 'game' && parts[1]) return { name: 'game', gameId: parts[1] }
  if (parts[0] === 'stats') return { name: 'stats' }
  if (parts[0] === 'settings') return { name: 'settings' }
  return { name: 'home' }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'game':
      return `#/game/${route.gameId}`
    case 'stats':
      return '#/stats'
    case 'settings':
      return '#/settings'
    default:
      return '#/'
  }
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((r: Route) => {
    window.location.hash = routeToHash(r)
  }, [])

  const goHome = useCallback(() => {
    // 히스토리를 쌓지 않고 홈으로 (홈에서 뒤로 = 앱 종료가 자연스럽도록)
    if (window.history.length > 1) window.history.back()
    else window.location.hash = '#/'
  }, [])

  return { route, navigate, goHome }
}
