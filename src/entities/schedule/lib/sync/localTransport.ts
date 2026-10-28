import { createEmitter } from './emitter'

import type {
  AlarmAck,
  AlarmKey,
  DeviceRole,
  RingingInfo,
  SharedSchedule,
  SyncStatus,
  SyncTransport,
} from '../../model/types'

type Message =
  | { t: 'hello' }
  | {
      t: 'state'
      schedule: SharedSchedule | null
      ringing: Record<AlarmKey, RingingInfo>
      acks: Record<AlarmKey, AlarmAck>
    }
  | { t: 'schedule'; schedule: SharedSchedule }
  | { t: 'ringing'; key: AlarmKey; info: RingingInfo | null }
  | { t: 'ack'; key: AlarmKey; ack: AlarmAck }

/** Same-browser transport over BroadcastChannel: for development, tests and when Firebase is not configured. */
export class LocalTransport implements SyncTransport {
  private channel: BroadcastChannel | null = null
  private status: SyncStatus = 'off'
  private schedule: SharedSchedule | null = null
  private ringing: Record<AlarmKey, RingingInfo> = {}
  private acks: Record<AlarmKey, AlarmAck> = {}
  private statusEmitter = createEmitter<SyncStatus>()
  private scheduleEmitter = createEmitter<SharedSchedule | null>()
  private ringingEmitter = createEmitter<Record<AlarmKey, RingingInfo>>()
  private acksEmitter = createEmitter<Record<AlarmKey, AlarmAck>>()

  private setStatus(status: SyncStatus) {
    this.status = status
    this.statusEmitter.emit(status)
  }

  private post(message: Message) {
    this.channel?.postMessage(message)
  }

  private applySchedule(schedule: SharedSchedule) {
    this.schedule = schedule
    this.scheduleEmitter.emit(schedule)
  }

  private applyRinging(key: AlarmKey, info: RingingInfo | null) {
    const next = { ...this.ringing }
    if (info) next[key] = info
    else delete next[key]
    this.ringing = next
    this.ringingEmitter.emit(next)
  }

  private applyAck(key: AlarmKey, ack: AlarmAck) {
    this.acks = { ...this.acks, [key]: ack }
    this.acksEmitter.emit(this.acks)
  }

  private receive(m: Message) {
    if (m.t === 'hello') {
      this.post({ t: 'state', schedule: this.schedule, ringing: this.ringing, acks: this.acks })
    } else if (m.t === 'state') {
      if (m.schedule) this.applySchedule(m.schedule)
      this.ringing = { ...this.ringing, ...m.ringing }
      this.acks = { ...this.acks, ...m.acks }
      this.ringingEmitter.emit(this.ringing)
      this.acksEmitter.emit(this.acks)
    } else if (m.t === 'schedule') {
      this.applySchedule(m.schedule)
    } else if (m.t === 'ringing') {
      this.applyRinging(m.key, m.info)
    } else {
      this.applyAck(m.key, m.ack)
    }
  }

  connect(householdId: string): Promise<void> {
    this.disconnect()
    if (typeof BroadcastChannel === 'undefined') {
      this.setStatus('offline')
      return Promise.resolve()
    }
    const channel = new BroadcastChannel(`life-tracker:sync:${householdId}`)
    channel.onmessage = (e: MessageEvent<Message>) => this.receive(e.data)
    this.channel = channel
    this.setStatus('online')
    this.post({ t: 'hello' })
    return Promise.resolve()
  }

  disconnect(): void {
    this.channel?.close()
    this.channel = null
    this.setStatus('off')
  }

  getStatus = () => this.status
  onStatus = (cb: (status: SyncStatus) => void) => this.statusEmitter.on(cb)
  onSchedule = (cb: (schedule: SharedSchedule | null) => void) => this.scheduleEmitter.on(cb)
  onRinging = (cb: (ringing: Record<AlarmKey, RingingInfo>) => void) => this.ringingEmitter.on(cb)
  onAcks = (cb: (acks: Record<AlarmKey, AlarmAck>) => void) => this.acksEmitter.on(cb)

  pushSchedule(schedule: SharedSchedule): Promise<void> {
    const copy = JSON.parse(JSON.stringify(schedule)) as SharedSchedule
    this.applySchedule(copy)
    this.post({ t: 'schedule', schedule: copy })
    return Promise.resolve()
  }

  setRinging(key: AlarmKey, info: RingingInfo | null): Promise<void> {
    this.applyRinging(key, info)
    this.post({ t: 'ringing', key, info })
    return Promise.resolve()
  }

  ack(key: AlarmKey, by: DeviceRole): Promise<void> {
    const ack = { by, at: Date.now() }
    this.applyAck(key, ack)
    this.post({ t: 'ack', key, ack })
    return Promise.resolve()
  }
}
