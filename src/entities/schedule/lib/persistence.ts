import { DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEY } from '../config'

import { normalizeEvent } from './validation'

import type { Completion, Participant, ScheduleEvent, ScheduleSnapshot, Settings } from '../model/types'

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)

function fail(message: string): never {
  throw new Error(message)
}

function parseParticipants(raw: unknown): Participant[] {
  if (!Array.isArray(raw)) fail('В файле нет списка участников')
  return raw.map((p, order) => {
    if (!isObj(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || !p.name.trim()) {
      fail(`Участник №${order + 1} описан неверно`)
    }
    return {
      id: p.id,
      name: p.name.trim(),
      color: typeof p.color === 'string' ? p.color : '#E4D9F5',
      order: typeof p.order === 'number' ? p.order : order,
    }
  })
}

function parseEvents(raw: unknown, participantIds: Set<string>): ScheduleEvent[] {
  if (!Array.isArray(raw)) fail('В файле нет списка событий')
  return raw.map((e, i) => {
    if (!isObj(e) || typeof e.id !== 'string') fail(`Событие №${i + 1} описано неверно`)
    try {
      const event = normalizeEvent(e as unknown as ScheduleEvent)
      if (!event.participantIds.every((id) => participantIds.has(id))) {
        fail('указан неизвестный участник')
      }
      return event
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'ошибка'
      const label = typeof e.title === 'string' && e.title ? `«${e.title}»` : `№${i + 1}`
      throw new Error(`Событие ${label}: ${reason}`)
    }
  })
}

function parseCompletions(raw: unknown): Completion[] {
  if (raw === undefined) return []
  if (!Array.isArray(raw)) fail('Отметки выполнения описаны неверно')
  return raw.filter(
    (c): c is Completion =>
      isObj(c) &&
      typeof c.eventId === 'string' &&
      typeof c.date === 'string' &&
      (c.status === 'done' || c.status === 'skipped'),
  )
}

function parseSettings(raw: unknown): Settings {
  const s = isObj(raw) ? raw : {}
  const q = s.quietHours
  return {
    notificationsEnabled:
      typeof s.notificationsEnabled === 'boolean' ? s.notificationsEnabled : DEFAULT_SETTINGS.notificationsEnabled,
    defaultRemindBefore:
      typeof s.defaultRemindBefore === 'number' ? s.defaultRemindBefore : DEFAULT_SETTINGS.defaultRemindBefore,
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    quietHours:
      q === null
        ? null
        : isObj(q) && typeof q.from === 'string' && typeof q.to === 'string'
          ? { from: q.from, to: q.to }
          : DEFAULT_SETTINGS.quietHours && { ...DEFAULT_SETTINGS.quietHours },
  }
}

/** Upgrades older snapshots step by step to the current schema and validates the result. */
export function migrate(raw: unknown): ScheduleSnapshot {
  if (!isObj(raw)) fail('Файл не похож на расписание')
  const version = raw.version
  if (typeof version !== 'number') fail('В файле не указана версия данных')
  if (version > SCHEMA_VERSION) fail('Файл создан в более новой версии приложения')

  const participants = parseParticipants(raw.participants)
  return {
    version: SCHEMA_VERSION,
    participants,
    events: parseEvents(raw.events, new Set(participants.map((p) => p.id))),
    completions: parseCompletions(raw.completions),
    settings: parseSettings(raw.settings),
  }
}

export function parseSnapshot(text: string): ScheduleSnapshot {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    fail('Не удалось прочитать файл: это не JSON')
  }
  return migrate(raw)
}

export function load(): ScheduleSnapshot | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? parseSnapshot(text) : null
  } catch {
    return null
  }
}

export function save(snapshot: ScheduleSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Storage may be full or unavailable; the app keeps working in memory.
  }
}
