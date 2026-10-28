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
}

export type ScheduleSnapshot = {
  version: number
  participants: Participant[]
  events: ScheduleEvent[]
  completions: Completion[]
  settings: Settings
}
