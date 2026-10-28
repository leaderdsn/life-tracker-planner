import type { AlarmSound, EventCategory, Settings, Weekday } from '../model/types'

export const WEEKDAYS: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  mon: 'ПН',
  tue: 'ВТ',
  wed: 'СР',
  thu: 'ЧТ',
  fri: 'ПТ',
  sat: 'СБ',
  sun: 'ВС',
}

export const WEEKDAY_NAMES: Record<Weekday, string> = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  thu: 'Четверг',
  fri: 'Пятница',
  sat: 'Суббота',
  sun: 'Воскресенье',
}

export const PASTEL_COLORS = [
  '#FCE8B2',
  '#CFE2FF',
  '#CDEFD6',
  '#E4D9F5',
  '#F9D3D9',
  '#FFD9C2',
  '#C9ECEF',
  '#E3EBB5',
]

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  activity: 'Занятие',
  study: 'Учёба',
  routine: 'Режим',
  logistics: 'Дорога',
  work: 'Работа',
}

export const REMIND_OPTIONS = [0, 5, 10, 15, 30, 60]

export const STORAGE_KEY = 'life-tracker:v1'

export const SCHEMA_VERSION = 2

export const DEVICE_STORAGE_KEY = 'life-tracker:device'

export const GUEST_CACHE_KEY = 'life-tracker:guest-cache'

export const ALARM_SOUNDS: AlarmSound[] = ['chime', 'beep', 'bell']

export const GUEST_LEAD_OPTIONS = [5, 10, 15, 30, 45, 60]

export const GUEST_IDLE_OPTIONS = [30, 60, 120, 300]

/** acknowledgements older than this are dropped */
export const ACK_TTL_MS = 2 * 24 * 60 * 60_000

export const PUSH_DELAY_MS = 1000

export const HOUSEHOLD_ID_LENGTH = 24

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: false,
  defaultRemindBefore: 10,
  sound: true,
  quietHours: { from: '22:00', to: '07:00' },
  guestAlarmLead: 30,
  guestIdleReturn: 60,
  alarmSound: 'chime',
  alarmVolume: 0.8,
  adminPinHash: null,
  autoComplete: false,
}

export const UNDO_TIMEOUT_MS = 10_000
