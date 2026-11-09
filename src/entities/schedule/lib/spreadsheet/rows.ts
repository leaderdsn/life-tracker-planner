import { parseIsoDate, toIsoDate, validateTime, weekdayOf } from '@/shared/lib'

import { CATEGORY_LABELS, PASTEL_COLORS, WEEKDAY_NAMES, WEEKDAY_SHORT, WEEKDAYS } from '../../config'
import { slugify, uniqueId } from '../ids'
import { normalizeEvent, ValidationError } from '../validation'

import { columnOf, COLUMN_ORDER, EVENT_HEADERS, headerKey, PARTICIPANT_HEADERS } from './columns'
import type { Column } from './columns'

import type { EventCategory, Participant, ScheduleEvent, Weekday } from '../../model/types'

export type Table = unknown[][]

export type SpreadsheetData = { events: Table; participants?: Table }

export type RowError = { row: number; message: string }

export type NewEvent = Omit<ScheduleEvent, 'id'>

export type ParsedImport = {
  events: NewEvent[]
  /** participants that do not exist yet; ids and colors are already assigned */
  participants: Participant[]
  errors: RowError[]
  /** non-empty data rows in the events table */
  rows: number
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

const isBlank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && !v.trim())

const text = (v: unknown) => (isBlank(v) ? '' : String(v).trim())

const nameKey = (name: string) => name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

const ruDate = (iso: string) => iso.split('-').reverse().join('.')

export function eventsToRows(
  events: ScheduleEvent[],
  participants: Pick<Participant, 'id' | 'name' | 'color' | 'order'>[],
): { events: (string | number)[][]; participants: string[][] } {
  const names = new Map(participants.map((p) => [p.id, p.name]))
  const header = COLUMN_ORDER.map((c) => EVENT_HEADERS[c])
  const rows = events.map((e) => {
    const cells: Record<Column, string | number> = {
      participants: e.participantIds.map((id) => names.get(id) ?? id).join(', '),
      day: e.date ? WEEKDAY_SHORT[weekdayOf(parseIsoDate(e.date)) as Weekday] : e.day ? WEEKDAY_SHORT[e.day] : '',
      date: e.date ? ruDate(e.date) : '',
      start: e.start,
      end: e.end ?? '',
      title: e.title,
      place: e.place ?? '',
      category: CATEGORY_LABELS[e.category],
      remind: e.remindBefore ?? '',
      showInAll: e.showInAll === false ? 'нет' : 'да',
      note: e.note ?? '',
    }
    return COLUMN_ORDER.map((c) => cells[c])
  })
  return {
    events: [header, ...rows],
    participants: [
      [PARTICIPANT_HEADERS.name, PARTICIPANT_HEADERS.color],
      ...[...participants].sort((a, b) => a.order - b.order).map((p) => [p.name, p.color]),
    ],
  }
}

const DAY_BY_KEY = new Map<string, Weekday>()
for (const d of WEEKDAYS) {
  DAY_BY_KEY.set(headerKey(WEEKDAY_SHORT[d]), d)
  DAY_BY_KEY.set(headerKey(WEEKDAY_NAMES[d]), d)
  DAY_BY_KEY.set(d, d)
}

function weekdayFromToken(token: string): Weekday | null {
  const key = headerKey(token)
  const exact = DAY_BY_KEY.get(key)
  if (exact) return exact
  if (key.length < 3) return null
  return WEEKDAYS.find((d) => headerKey(WEEKDAY_NAMES[d]).startsWith(key)) ?? null
}

function parseDays(raw: string): Weekday[] | null {
  const days: Weekday[] = []
  for (const token of raw.split(/[\s,;/+]+/).filter((t) => t && t.toLowerCase() !== 'и')) {
    const range = token.split(/[-–—]/).filter(Boolean)
    const first = weekdayFromToken(range[0] ?? '')
    const last = weekdayFromToken(range[range.length - 1] ?? '')
    if (!first || !last) return null
    if (range.length < 2) {
      days.push(first)
      continue
    }
    const from = WEEKDAYS.indexOf(first)
    const to = WEEKDAYS.indexOf(last)
    if (to < from) return null
    days.push(...WEEKDAYS.slice(from, to + 1))
  }
  return days.length ? [...new Set(days)] : null
}

function isoFromParts(y: number, m: number, d: number): string | null {
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return toIsoDate(date)
}

function dateFromSerial(n: number): string | null {
  if (!Number.isFinite(n) || n < 1 || n > 80000) return null
  const utc = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000)
  return isoFromParts(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate())
}

function parseDate(v: unknown): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : toIsoDate(v)
  if (typeof v === 'number') return dateFromSerial(v)
  const s = text(v)
  const ru = /^(\d{1,2})[./-](\d{1,2})[./-](\d{2}|\d{4})$/.exec(s)
  if (ru) return isoFromParts(ru[3]!.length === 2 ? 2000 + Number(ru[3]) : Number(ru[3]), Number(ru[2]), Number(ru[1]))
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s)
  if (iso) return isoFromParts(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  return /^\d{5}$/.test(s) ? dateFromSerial(Number(s)) : null
}

/** A date-time serial (e.g. 46000.375) carries the time in its fraction. */
function timeInput(v: unknown): unknown {
  if (typeof v === 'number' && v >= 24 && !Number.isInteger(v)) return v - Math.floor(v)
  return v
}

const CATEGORY_BY_KEY = new Map<string, EventCategory>()
for (const [id, label] of Object.entries(CATEGORY_LABELS)) {
  CATEGORY_BY_KEY.set(id, id as EventCategory)
  CATEGORY_BY_KEY.set(headerKey(label), id as EventCategory)
}
CATEGORY_BY_KEY.set('школа', 'study')
CATEGORY_BY_KEY.set('логистика', 'logistics')
CATEGORY_BY_KEY.set('распорядок', 'routine')

const NO = new Set(['нет', 'no', 'false', '0', 'н', '-', 'скрыто', 'скрыть', 'ложь'])

function nextFreeColor(used: Set<string>): string {
  return PASTEL_COLORS.find((c) => !used.has(c)) ?? PASTEL_COLORS[used.size % PASTEL_COLORS.length]!
}

function hexOf(v: unknown): string | null {
  const m = HEX.exec(text(v))
  if (!m) return null
  const body = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join('') : m[1]!
  return `#${body.toUpperCase()}`
}

class Roster {
  readonly created: Participant[] = []
  private readonly byName = new Map<string, Participant>()
  private readonly ids: Set<string>
  private readonly colors: Set<string>
  private order: number

  constructor(existing: Participant[]) {
    for (const p of existing) this.byName.set(nameKey(p.name), p)
    this.ids = new Set(existing.map((p) => p.id))
    this.colors = new Set(existing.map((p) => p.color.toUpperCase()))
    this.order = existing.reduce((max, p) => Math.max(max, p.order), -1) + 1
  }

  resolve(name: string, color?: string | null): Participant {
    const known = this.byName.get(nameKey(name))
    if (known) return known
    const chosen = color ?? nextFreeColor(this.colors)
    this.colors.add(chosen.toUpperCase())
    const id = uniqueId(slugify(name), this.ids)
    this.ids.add(id)
    const p: Participant = { id, name: name.replace(/\s+/g, ' ').trim(), color: chosen, order: this.order++ }
    this.byName.set(nameKey(name), p)
    this.created.push(p)
    return p
  }
}

type Header = { index: number; columns: Map<number, Column> }

function findHeader(table: Table): Header | null {
  let best: Header | null = null
  table.slice(0, 5).forEach((row, index) => {
    const columns = new Map<number, Column>()
    row.forEach((cell, i) => {
      const column = columnOf(cell)
      if (column && ![...columns.values()].includes(column)) columns.set(i, column)
    })
    if (columns.size >= 2 && columns.size > (best?.columns.size ?? 0)) best = { index, columns }
  })
  return best
}

function readParticipantSheet(table: Table | undefined, roster: Roster) {
  if (!table) return
  const hasHeader = ['имя', 'участник', 'участники', 'имена'].includes(headerKey(table[0]?.[0]))
  for (const row of table.slice(hasHeader ? 1 : 0)) {
    const name = text(row[0])
    if (name) roster.resolve(name, hexOf(row[1]))
  }
}

function missingColumns(columns: Map<number, Column>): string[] {
  const have = new Set(columns.values())
  const need: [string, boolean][] = [
    [EVENT_HEADERS.participants, have.has('participants')],
    [EVENT_HEADERS.start, have.has('start')],
    [EVENT_HEADERS.title, have.has('title')],
    [`${EVENT_HEADERS.day} или ${EVENT_HEADERS.date}`, have.has('day') || have.has('date')],
  ]
  return need.filter(([, ok]) => !ok).map(([name]) => name)
}

export function rowsToEvents(data: SpreadsheetData, existingParticipants: Participant[] = []): ParsedImport {
  const result: ParsedImport = { events: [], participants: [], errors: [], rows: 0 }
  const header = findHeader(data.events)
  if (!header) {
    result.errors.push({ row: 1, message: 'Не найдена строка заголовков (Участники, День, Начало, Занятие…)' })
    return result
  }
  const missing = missingColumns(header.columns)
  if (missing.length) {
    result.errors.push({ row: header.index + 1, message: `Не найден столбец: ${missing.join(', ')}` })
    return result
  }

  const roster = new Roster(existingParticipants)
  readParticipantSheet(data.participants, roster)

  data.events.slice(header.index + 1).forEach((cells, i) => {
    if (cells.every(isBlank)) return
    result.rows++
    const get: Partial<Record<Column, unknown>> = {}
    for (const [index, column] of header.columns) get[column] = cells[index]
    const parsed = parseRow(get, roster)
    if ('error' in parsed) result.errors.push({ row: header.index + 2 + i, message: parsed.error })
    else result.events.push(...parsed.events)
  })

  result.participants = roster.created
  return result
}

type RowResult = { events: NewEvent[] } | { error: string }

function parseRow(get: Partial<Record<Column, unknown>>, roster: Roster): RowResult {
  const review: string[] = []

  const names = text(get.participants)
    .split(/[,;/+&]+/)
    .map((n) => n.trim())
    .filter(Boolean)
  if (!names.length) return { error: 'Не указан участник' }

  const title = text(get.title)
  if (!title) return { error: 'Не указано название занятия' }

  const start = validateTime(timeInput(get.start))
  if ('error' in start) return { error: `Начало: ${start.error}` }

  let end: string | undefined
  if (!isBlank(get.end)) {
    const res = validateTime(timeInput(get.end))
    if ('error' in res) review.push(`Окончание «${text(get.end)}» не распознано`)
    else if (res.value <= start.value) review.push(`Окончание ${res.value} раньше начала, оно пропущено`)
    else end = res.value
  }

  const dayText = text(get.day)
  let days = dayText ? parseDays(dayText) : null
  let date: string | undefined
  if (!isBlank(get.date)) {
    date = parseDate(get.date) ?? undefined
    if (!date) {
      if (!days) return { error: `Дата «${text(get.date)}» указана неверно` }
      review.push(`Дата «${text(get.date)}» не распознана, занятие добавлено как еженедельное`)
    }
  }
  if (dayText && !days) {
    if (!date) return { error: `Неизвестный день недели «${dayText}»` }
    review.push(`День «${dayText}» не распознан, взят день из даты`)
  }
  if (!days && !date) return { error: 'Укажите день недели или дату' }
  if (date && days && (days.length > 1 || days[0] !== weekdayOf(parseIsoDate(date)))) {
    review.push('День недели не совпадает с датой, использована дата')
  }
  if (date) days = null

  let category: EventCategory = 'activity'
  const categoryText = text(get.category)
  if (categoryText) {
    const found = CATEGORY_BY_KEY.get(headerKey(categoryText))
    if (found) category = found
    else review.push(`Категория «${categoryText}» не распознана, выбрано «${CATEGORY_LABELS.activity}»`)
  }

  let remindBefore: number | undefined
  if (!isBlank(get.remind)) {
    const n = Number(String(get.remind).replace(',', '.'))
    if (Number.isInteger(n) && n >= 0 && n <= 1440) remindBefore = n
    else review.push(`Напоминание «${text(get.remind)}» не распознано`)
  }

  const hidden = NO.has(text(get.showInAll).toLowerCase())

  const base: ScheduleEvent = {
    id: '',
    participantIds: [],
    start: start.value,
    title,
    category,
    ...(end ? { end } : {}),
    ...(text(get.place) ? { place: text(get.place) } : {}),
    ...(text(get.note) ? { note: text(get.note) } : {}),
    ...(remindBefore !== undefined ? { remindBefore } : {}),
    ...(hidden ? { showInAll: false } : {}),
    ...(review.length ? { needsReview: review.join('; ') } : {}),
  }

  const variants = date ? [{ date }] : (days ?? []).map((day) => ({ day }))
  try {
    normalizeEvent({ ...base, participantIds: ['probe'], ...variants[0] })
  } catch (err) {
    return { error: err instanceof ValidationError ? err.message : 'Строка не распознана' }
  }

  const participantIds = [...new Set(names.map((n) => roster.resolve(n).id))]
  return {
    events: variants.map((v) => {
      const event: Partial<ScheduleEvent> = normalizeEvent({ ...base, participantIds, ...v })
      delete event.id
      return event as NewEvent
    }),
  }
}
