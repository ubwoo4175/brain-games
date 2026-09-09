/// <reference lib="webworker" />
/**
 * 서비스 워커 — 오프라인 캐시(기존 동작) + 푸시 알림 수신.
 * vite-plugin-pwa 의 injectManifest 모드로 빌드됩니다 (vite.config.ts).
 */
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// 기존 autoUpdate 와 같은 동작: 새 버전이 오면 바로 적용
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
self.skipWaiting()
clientsClaim()

interface PushPayload {
  title?: string
  body?: string
  tag?: string
}

self.addEventListener('push', (event: PushEvent) => {
  let data: PushPayload = {}
  try {
    data = event.data ? (event.data.json() as PushPayload) : {}
  } catch {
    data = { body: event.data?.text() }
  }
  const title = data.title || '오늘의 두뇌운동'
  const scope = self.registration.scope
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '오늘 두뇌운동 하러 오세요 🙂',
      icon: scope + 'icons/icon-192.png',
      badge: scope + 'icons/icon-192.png',
      lang: 'ko',
      tag: data.tag || 'daily-reminder',
      renotify: true,
      requireInteraction: false,
    } as NotificationOptions),
  )
})

// 알림을 누르면 앱을 열거나, 이미 열려 있으면 그 창으로
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = self.registration.scope
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if (client.url.startsWith(url)) return client.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})
