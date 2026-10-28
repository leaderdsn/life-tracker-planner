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
  '#F7B7A3',
  '#A8E6CF',
  '#A5D8F3',
  '#B8B8F0',
  '#E8B4D8',
  '#F5CF8B',
  '#B5C9A8',
  '#8FD3D0',
]

export const COLOR_NAMES: Record<string, string> = {
  '#FCE8B2': 'Сливочный',
  '#CFE2FF': 'Голубой',
  '#CDEFD6': 'Фисташковый',
  '#E4D9F5': 'Сиреневый',
  '#F9D3D9': 'Розовый',
  '#FFD9C2': 'Персиковый',
  '#C9ECEF': 'Бирюзовый',
  '#E3EBB5': 'Салатовый',
  '#F7B7A3': 'Коралловый',
  '#A8E6CF': 'Мятный',
  '#A5D8F3': 'Небесный',
  '#B8B8F0': 'Барвинок',
  '#E8B4D8': 'Орхидея',
  '#F5CF8B': 'Медовый',
  '#B5C9A8': 'Шалфей',
  '#8FD3D0': 'Морской',
}

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

export const SOUND_GROUPS: { label: string; sounds: AlarmSound[] }[] = [
  { label: 'Мелодичные', sounds: ['chime', 'bell', 'marimba', 'xylophone', 'cuckoo'] },
  { label: 'Спокойные', sounds: ['harp', 'piano', 'soft', 'birds', 'drops'] },
  { label: 'Громкие', sounds: ['beep', 'digital'] },
]

export const ALARM_SOUNDS: AlarmSound[] = SOUND_GROUPS.flatMap((group) => group.sounds)

export const SOUND_LABELS: Record<AlarmSound, string> = {
  chime: 'Перезвон',
  bell: 'Колокольчик',
  marimba: 'Маримба',
  xylophone: 'Ксилофон',
  cuckoo: 'Кукушка',
  harp: 'Арфа',
  piano: 'Пианино',
  soft: 'Мягкий',
  birds: 'Птицы',
  drops: 'Капли',
  beep: 'Сигнал',
  digital: 'Будильник',
}

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
