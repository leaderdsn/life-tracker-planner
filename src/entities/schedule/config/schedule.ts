import type { EventCategory, Settings, Weekday } from '../model/types'

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

export const SCHEMA_VERSION = 1

export const DEFAULT_SETTINGS: Settings = {
  notificationsEnabled: false,
  defaultRemindBefore: 10,
  sound: true,
  quietHours: { from: '22:00', to: '07:00' },
}

export const UNDO_TIMEOUT_MS = 10_000
