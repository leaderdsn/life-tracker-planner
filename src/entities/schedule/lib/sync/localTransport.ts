import { createEmitter } from './emitter'

import type {
  AlarmAck,
  AlarmKey,
  DeviceRole,
  ParticipantProfile,
  RingingInfo,
  SharedSchedule,
  SyncStatus,
  SyncedCompletion,
  SyncTransport,
} from '../../model/types'

type Message =
  | { t: 'hello' }
  | {
      t: 'state'
      schedule: SharedSchedule | null
      ringing: Record<AlarmKey, RingingInfo>
      acks: Record<AlarmKey, AlarmAck>
      profiles: Record<string, ParticipantProfile>
      completions: Record<string, SyncedCompletion>
    }
  | { t: 'schedule'; schedule: SharedSchedule }
  | { t: 'ringing'; key: AlarmKey; info: RingingInfo | null }
  | { t: 'ack'; key: AlarmKey; ack: AlarmAck }
  | { t: 'profile'; id: string; profile: ParticipantProfile }
  | { t: 'completion'; key: string; value: SyncedCompletion | null }

/** Same-browser transport over BroadcastChannel: for development, tests and when Firebase is not configured. */
export class LocalTransport implements SyncTransport {
  private channel: BroadcastChannel | null = null
  private status: SyncStatus = 'off'
  private schedule: SharedSchedule | null = null
  private ringing: Record<AlarmKey, RingingInfo> = {}
  private acks: Record<AlarmKey, AlarmAck> = {}
  private profiles: Record<string, ParticipantProfile> = {}
  private completions: Record<string, SyncedCompletion> = {}
  private profilesEmitter = createEmitter<Record<string, ParticipantProfile>>()
  private completionsEmitter = createEmitter<Record<string, SyncedCompletion>>()
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

  private applyProfile(id: string, profile: ParticipantProfile) {
    this.profiles = { ...this.profiles, [id]: profile }
    this.profilesEmitter.emit(this.profiles)
  }

  private applyCompletion(key: string, value: SyncedCompletion | null) {
    const next = { ...this.completions }
    if (value) next[key] = value
    else delete next[key]
    this.completions = next
    this.completionsEmitter.emit(next)
  }

  private receive(m: Message) {
    if (m.t === 'hello') {
      this.post({
        t: 'state',
        schedule: this.schedule,
        ringing: this.ringing,
        acks: this.acks,
        profiles: this.profiles,
        completions: this.completions,
      })
    } else if (m.t === 'state') {
      if (m.schedule) this.applySchedule(m.schedule)
      this.ringing = { ...this.ringing, ...m.ringing }
      this.acks = { ...this.acks, ...m.acks }
      this.ringingEmitter.emit(this.ringing)
      this.acksEmitter.emit(this.acks)
      this.profiles = { ...this.profiles, ...m.profiles }
      this.completions = { ...this.completions, ...m.completions }
      this.profilesEmitter.emit(this.profiles)
      this.completionsEmitter.emit(this.completions)
    } else if (m.t === 'profile') {
      this.applyProfile(m.id, m.profile)
    } else if (m.t === 'completion') {
      this.applyCompletion(m.key, m.value)
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

  onProfiles = (cb: (profiles: Record<string, ParticipantProfile>) => void) => this.profilesEmitter.on(cb)
  onCompletions = (cb: (completions: Record<string, SyncedCompletion>) => void) => this.completionsEmitter.on(cb)

  pushProfile(participantId: string, profile: ParticipantProfile): Promise<void> {
    const copy = JSON.parse(JSON.stringify(profile)) as ParticipantProfile
    this.applyProfile(participantId, copy)
    this.post({ t: 'profile', id: participantId, profile: copy })
    return Promise.resolve()
  }

  setCompletion(key: string, value: SyncedCompletion | null): Promise<void> {
    this.applyCompletion(key, value)
    this.post({ t: 'completion', key, value })
    return Promise.resolve()
  }

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
