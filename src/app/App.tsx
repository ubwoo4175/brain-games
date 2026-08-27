import { getGame } from '../games'
import { AppProvider } from './AppContext'
import { useHashRoute } from './router'
import { GameScreen } from './screens/GameScreen'
import { HomeScreen } from './screens/HomeScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { StatsScreen } from './screens/StatsScreen'
import './screens.css'

function Splash() {
  return (
    <div className="splash">
      <span className="splash__icon" aria-hidden>
        🧠
      </span>
      <span>오늘의 두뇌운동</span>
    </div>
  )
}

function Screens() {
  const { route, navigate, goHome } = useHashRoute()

  switch (route.name) {
    case 'game': {
      const game = getGame(route.gameId)
      if (!game) {
        navigate({ name: 'home' })
        return null
      }
      // key=gameId: 다른 게임으로 바뀌면 화면 상태 초기화
      return <GameScreen key={game.id} game={game} onExit={goHome} />
    }
    case 'stats':
      return <StatsScreen onBack={goHome} />
    case 'settings':
      return <SettingsScreen onBack={goHome} />
    default:
      return <HomeScreen navigate={navigate} />
  }
}

export default function App() {
  return (
    <AppProvider fallback={<Splash />}>
      <Screens />
    </AppProvider>
  )
}
