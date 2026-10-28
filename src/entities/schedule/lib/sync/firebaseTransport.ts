import { createEmitter } from './emitter'
import { parseShared } from './sharedSchedule'

import type { FirebaseConfig } from '@/shared/config'

import type {
  AlarmAck,
  AlarmKey,
  DeviceRole,
  RingingInfo,
  SharedSchedule,
  SyncStatus,
  SyncTransport,
  Unsubscribe,
} from '../../model/types'
import type { Database } from 'firebase/database'

// Realtime Database keys cannot contain . $ # [ ] /
const encodeKey = (key: string) =>
  key.replace(/[%.$#[\]/]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

function decodeMap<T>(raw: unknown, fix: (v: Record<string, unknown>) => T): Record<AlarmKey, T> {
  const out: Record<AlarmKey, T> = {}
  if (typeof raw === 'object' && raw !== null) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === 'object' && v !== null) out[decodeURIComponent(k)] = fix(v as Record<string, unknown>)
    }
  }
  return out
}

/** Firebase Realtime Database with anonymous auth; SDK modules load on the first connect. */
export class FirebaseTransport implements SyncTransport {
  private config: FirebaseConfig
  private db: Database | null = null
  private base = ''
  private session = 0
  private status: SyncStatus = 'off'
  private unsubs: Unsubscribe[] = []
  private statusEmitter = createEmitter<SyncStatus>()
  private scheduleEmitter = createEmitter<SharedSchedule | null>()
  private ringingEmitter = createEmitter<Record<AlarmKey, RingingInfo>>()
  private acksEmitter = createEmitter<Record<AlarmKey, AlarmAck>>()

  constructor(config: FirebaseConfig) {
    this.config = config
  }

  private setStatus(status: SyncStatus) {
    this.status = status
    this.statusEmitter.emit(status)
  }

  async connect(householdId: string): Promise<void> {
    this.disconnect()
    const session = this.session
    this.base = `households/${householdId}`
    this.setStatus('connecting')
    try {
      const [{ getApp, getApps, initializeApp }, { getAuth, signInAnonymously }, rtdb] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/database'),
      ])
      const app = getApps().length ? getApp() : initializeApp(this.config)
      const auth = getAuth(app)
      if (!auth.currentUser) await signInAnonymously(auth)
      if (session !== this.session) return

      const db = rtdb.getDatabase(app)
      this.db = db
      const watch = (path: string, cb: (value: unknown) => void) =>
        this.unsubs.push(rtdb.onValue(rtdb.ref(db, path), (snap) => cb(snap.val())))

      watch('.info/connected', (on) => this.setStatus(on ? 'online' : 'offline'))
      watch(`${this.base}/schedule`, (v) => this.scheduleEmitter.emit(parseShared(v)))
      watch(`${this.base}/ringing`, (v) =>
        this.ringingEmitter.emit(
          decodeMap(v, (r) => ({
            title: typeof r.title === 'string' ? r.title : '',
            participantNames: Array.isArray(r.participantNames) ? r.participantNames.map(String) : [],
            startedAt: Number(r.startedAt) || 0,
          })),
        ),
      )
      watch(`${this.base}/acks`, (v) =>
        this.acksEmitter.emit(
          decodeMap(v, (r): AlarmAck => ({ by: r.by === 'admin' ? 'admin' : 'guest', at: Number(r.at) || 0 })),
        ),
      )
    } catch {
      if (session === this.session) this.setStatus('offline')
    }
  }

  disconnect(): void {
    this.session++
    this.unsubs.forEach((u) => u())
    this.unsubs = []
    this.db = null
    this.setStatus('off')
  }

  getStatus = () => this.status
  onStatus = (cb: (status: SyncStatus) => void) => this.statusEmitter.on(cb)
  onSchedule = (cb: (schedule: SharedSchedule | null) => void) => this.scheduleEmitter.on(cb)
  onRinging = (cb: (ringing: Record<AlarmKey, RingingInfo>) => void) => this.ringingEmitter.on(cb)
  onAcks = (cb: (acks: Record<AlarmKey, AlarmAck>) => void) => this.acksEmitter.on(cb)

  private async write(path: string, value: unknown) {
    if (!this.db) return
    const { ref, set } = await import('firebase/database')
    // the database rejects undefined; a JSON round trip drops it
    await set(ref(this.db, `${this.base}/${path}`), value === null ? null : JSON.parse(JSON.stringify(value)))
  }

  pushSchedule(schedule: SharedSchedule): Promise<void> {
    return this.write('schedule', schedule)
  }

  setRinging(key: AlarmKey, info: RingingInfo | null): Promise<void> {
    return this.write(`ringing/${encodeKey(key)}`, info)
  }

  ack(key: AlarmKey, by: DeviceRole): Promise<void> {
    return this.write(`acks/${encodeKey(key)}`, { by, at: Date.now() })
  }
}
