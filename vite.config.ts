import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages 배포 시 저장소 이름이 경로에 붙습니다 (예: https://id.github.io/brain-games/).
// 배포 워크플로(.github/workflows/deploy.yml)가 BASE_PATH 환경변수로 넘겨줍니다.
// 로컬 개발(npm run dev)에서는 '/' 입니다.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: '오늘의 두뇌운동',
        short_name: '두뇌운동',
        description: '하루 5분, 가볍게 즐기는 두뇌 운동 게임',
        lang: 'ko',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FFF8F0',
        theme_color: '#FF7A59',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,json,woff2}'],
      },
    }),
  ],
})
