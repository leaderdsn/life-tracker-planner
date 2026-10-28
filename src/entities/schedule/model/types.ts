export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

export type EventCategory = 'activity' | 'study' | 'routine' | 'logistics' | 'work'

/** 'YYYY-MM-DD' in local time */
export type IsoDate = string

/** 'HH:MM', 24h */
export type Time = string

export type Participant = {
  id: string
  name: string
  color: string
  order: number
  /** SHA-256 of `${householdId ?? "local"}:${id}:${pin}`; null/undefined = no PIN */
  pinHash?: string | null
  avatar?: string
  alarmSound?: AlarmSound
}

/** Fields a participant may edit about themself; synced separately from the schedule. */
export type ParticipantProfile = {
  /** data URL, 128×128 */
  avatar?: string
  alarmSound?: AlarmSound
}

/** Weekly recurring when `day` is set, one-off when `date` is set. */
export type ScheduleEvent = {
  id: string
  participantIds: string[]
  day?: Weekday
  date?: IsoDate
  start: Time
  end?: Time
  title: string
  place?: string
  note?: string
  category: EventCategory
  /** minutes before start; undefined = default from settings */
  remindBefore?: number
  /** reason shown in the "?" badge; cleared once the user edits or confirms the event */
  needsReview?: string
}

export type CompletionStatus = 'done' | 'skipped'

export type Completion = {
  eventId: string
  date: IsoDate
  status: CompletionStatus
}

export type Occurrence = {
  event: ScheduleEvent
  date: IsoDate
  /** epoch ms; end defaults to start + 30 min */
  startAt: number
  endAt: number
}

export type GridRow = {
  time: Time
  cells: Partial<Record<Weekday, ScheduleEvent[]>>
}

export type Grid = {
  days: Weekday[]
  rows: GridRow[]
}

export type EventStatus = 'past' | 'current' | 'next' | 'upcoming'

export type Conflict = {
  participantId: string
  eventIds: [string, string]
  /** weekday for weekly events, date for one-offs */
  day: string
}

export type ProgressCounter = { done: number; total: number }

export type ProgressPeriod = 'day' | 'week' | 'month'

/** participantId -> counter */
export type Progress = Record<string, ProgressCounter>

export type Settings = {
  notificationsEnabled: boolean
  /** minutes */
  defaultRemindBefore: number
  sound: boolean
  /** start inclusive, end exclusive; may wrap past midnight; null = off */
  quietHours: { from: Time; to: Time } | null
  /** minutes before start when the guest screen starts ringing */
  guestAlarmLead: number
  /** seconds without interaction before the guest screen returns to «Все» */
  guestIdleReturn: number
  alarmSound: AlarmSound
  /** 0..1 */
  alarmVolume: number
  /** SHA-256 hex of the admin PIN; null = not set */
  adminPinHash: string | null
  /** derive 'done' for occurrences whose participant moved on to the next one */
  autoComplete: boolean
}

export type AlarmSound =
  | 'chime'
  | 'bell'
  | 'marimba'
  | 'xylophone'
  | 'harp'
  | 'piano'
  | 'cuckoo'
  | 'soft'
  | 'birds'
  | 'drops'
  | 'beep'
  | 'digital'

export type ScheduleSnapshot = {
  version: number
  participants: Participant[]
  events: ScheduleEvent[]
  completions: Completion[]
  settings: Settings
}

export type DeviceRole = 'admin' | 'guest' | 'participant'

/** Stored per device, never synced. */
export type DeviceConfig = {
  role: DeviceRole
  householdId: string | null
  /** set when role is participant */
  participantId: string | null
}

export type SyncedCompletion = {
  status: CompletionStatus
  by: DeviceRole
  at: number
}

/** `${eventId}|${date}` */
export type AlarmKey = string

export type RingingInfo = {
  title: string
  participantNames: string[]
  startedAt: number
}

export type AlarmAck = {
  by: DeviceRole
  at: number
}

export type SyncStatus = 'off' | 'connecting' | 'online' | 'offline'

/** Part of the snapshot shared between devices; completions stay local. */
export type SharedSchedule = Pick<ScheduleSnapshot, 'version' | 'participants' | 'events' | 'settings'>

export type Unsubscribe = () => void

export type SyncTransport = {
  connect(householdId: string): Promise<void>
  disconnect(): void
  getStatus(): SyncStatus
  onStatus(cb: (status: SyncStatus) => void): Unsubscribe
  pushSchedule(schedule: SharedSchedule): Promise<void>
  onSchedule(cb: (schedule: SharedSchedule | null) => void): Unsubscribe
  setRinging(key: AlarmKey, info: RingingInfo | null): Promise<void>
  onRinging(cb: (ringing: Record<AlarmKey, RingingInfo>) => void): Unsubscribe
  ack(key: AlarmKey, by: DeviceRole): Promise<void>
  onAcks(cb: (acks: Record<AlarmKey, AlarmAck>) => void): Unsubscribe
  pushProfile(participantId: string, profile: ParticipantProfile): Promise<void>
  onProfiles(cb: (profiles: Record<string, ParticipantProfile>) => void): Unsubscribe
  /** key = `${eventId}|${date}`; null clears */
  setCompletion(key: string, value: SyncedCompletion | null): Promise<void>
  onCompletions(cb: (completions: Record<string, SyncedCompletion>) => void): Unsubscribe
}
