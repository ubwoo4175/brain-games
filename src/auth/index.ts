import { AnonymousAuth } from './AnonymousAuth'
import type { AuthProvider } from './AuthProvider'

let instance: AuthProvider | null = null

export function getAuth(): AuthProvider {
  if (!instance) instance = new AnonymousAuth()
  return instance
}

export type { AuthProvider, AuthUser } from './AuthProvider'
