import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { registerSW } from 'virtual:pwa-register'

// PWA: 새 버전이 배포되면 다음 실행 때 자동으로 갱신
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
