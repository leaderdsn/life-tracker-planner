import { env } from '@/shared/config'

import { FirebaseTransport } from './firebaseTransport'
import { LocalTransport } from './localTransport'

import type { SyncTransport } from '../../model/types'

export function createTransport(): SyncTransport {
  return env.firebase ? new FirebaseTransport(env.firebase) : new LocalTransport()
}
