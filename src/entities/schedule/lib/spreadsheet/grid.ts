import { normalizeTime, normalizeTitle } from '@/shared/lib'

import { WEEKDAY_NAMES, WEEKDAY_SHORT, WEEKDAYS } from '../../config'
import { normalizeEvent, ValidationError } from '../validation'

import { headerKey } from './columns'
import { isBlank, nameKey, Roster, text } from './rows'
import type { NewEvent, ParsedImport, SpreadsheetData, Table } from './rows'

import type { Participant, ScheduleEvent, Weekday } from '../../model/types'

const SELF = 'Я'
const NO_TIME_NOTE = 'Время не указано в таблице'
const END_BEFORE_START = 'Окончание раньше начала — проверьте'
const NOTE_REVIEW = 'Пометка из таблицы — проверьте'
const NOTE_TITLE = 'Отвезти/забрать детей'

const DAY_BY_KEY = new Map<string, Weekday>()
for (const d of WEEKDAYS) {
  DAY_BY_KEY.set(headerKey(WEEKDAY_SHORT[d]), d)
  DAY_BY_KEY.set(headerKey(WEEKDAY_NAMES[d]), d)
}

type GridColumn = { index: number; day: Weekday; notes: boolean }
type GridHeader = { row: number; timeIndex: number; columns: GridColumn[] }

export function findGridHeader(table: Table): GridHeader | null {
  for (let row = 0; row < Math.min(10, table.length); row++) {
    const cells = table[row] ?? []
    const timeIndex = cells.findIndex((c) => headerKey(c) === 'время')
    if (timeIndex < 0) continue
    const columns: GridColumn[] = []
    cells.forEach((cell, index) => {
      const raw = text(cell)
      const day = DAY_BY_KEY.get(headerKey(raw))
      if (!day) return
      const prev = columns[columns.length - 1]
      const before = text(cells[index - 1])
      const notes =
        raw.length === 2 && raw === raw.toLowerCase() && prev?.index === index - 1 && !prev.notes && prev.day === day && before === before.toUpperCase()
      columns.push({ index, day, notes })
    })
    if (columns.filter((c) => !c.notes).length >= 2) return { row, timeIndex, columns }
  }
  return null
}

const END_RE = /\(?\s*(?<![\p{L}])до\s*(\d{1,2})(?:\s*[.:/-]\s*(\d{2}))?\s*\)?/iu

export type ParsedCell = { title: string; end?: string; names: string[]; review?: string }

function matchName(token: string, names: string[]): string | null {
  const key = nameKey(token)
  if ([...key].filter((c) => /\p{L}/u.test(c)).length < 2) return null
  return names.find((n) => nameKey(n).startsWith(key)) ?? null
}

export function parseCell(raw: string, start: string, names: string[]): ParsedCell {
  let s = raw.replace(/\s*[\r\n]+\s*/g, ' ')
  let end: string | undefined
  let review: string | undefined

  const m = END_RE.exec(s)
  if (m) {
    const parsed = normalizeTime(`${m[1]}:${m[2] ?? '00'}`)
    s = s.replace(m[0], ' ')
    if (parsed) {
      if (parsed > start) end = parsed
      else review = END_BEFORE_START
    }
  }

  const found: string[] = []
  s = s.replace(/\(([^()]*)\)/g, (whole, inner: string) => {
    const tokens = inner.split(/[,;/+&]+/).map((t) => t.trim()).filter(Boolean)
    const matched = tokens.map((t) => matchName(t, names))
    if (!tokens.length || matched.some((x) => !x)) return whole
    found.push(...(matched as string[]))
    return ' '
  })

  s = s.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/,(\s*,)+/g, ',').replace(/^[\s,]+|[\s,]+$/g, '')
  return { title: s ? normalizeTitle(s) : '', ...(end ? { end } : {}), names: [...new Set(found)], ...(review ? { review } : {}) }
}

const SELF_NOTE_RE = /(?:[←⟵]|<-+)\s*я(?![\p{L}])\s*(?:[вк]\s*)?(\d{1,2}\s*[.:/-]\s*\d{2}|\d{1,2}(?!\d))?/iu

export function parseSelfNote(raw: string): { time?: string } | null {
  const m = SELF_NOTE_RE.exec(raw.replace(/\s+/g, ' '))
  if (!m) return null
  const time = m[1] ? normalizeTime(m[1].replace(/\s+/g, '').replace(/[/-]/, ':')) : null
  return time ? { time } : {}
}

const isUpperOnly = (s: string) => {
  const letters = s.replace(/[^\p{L}]/gu, '')
  return letters.length > 0 && letters === letters.toUpperCase()
}

const looksPersonal = (raw: string) => isUpperOnly(raw) && /(^|\s)(моя|мой|мои|моё|мое|работ)/i.test(raw)

const isPersonName = (name: string) => /^\p{Lu}\p{Ll}+$/u.test(name.trim())

function build(
  participantIds: string[],
  day: Weekday,
  start: string,
  title: string,
  end: string | undefined,
  review: string[],
  category: ScheduleEvent['category'] = 'activity',
): NewEvent {
  const event: Partial<ScheduleEvent> = normalizeEvent({
    id: '',
    participantIds,
    day,
    start,
    title,
    category,
    ...(end ? { end } : {}),
    ...(review.length ? { needsReview: review.join('; ') } : {}),
  })
  delete event.id
  return event as NewEvent
}

export function parseGrid(data: SpreadsheetData, existing: Participant[]): ParsedImport | null {
  const sheets = (data.sheets?.length ? data.sheets : [{ name: '', table: data.events }])
    .map((sheet) => ({ ...sheet, header: findGridHeader(sheet.table) }))
    .filter((s): s is typeof s & { header: GridHeader } => s.header !== null)
  if (!sheets.length) return null

  const roster = new Roster(existing)
  const known = new Set(existing.map((p) => nameKey(p.name)))
  const personal = new Map<string, string>()
  for (const sheet of sheets) {
    const name = sheet.name.trim()
    if (name && (known.has(nameKey(name)) || (isPersonName(name) && !sheet.header.columns.some((c) => c.notes)))) {
      personal.set(sheet.name, roster.resolve(name).id)
    }
  }
  const personalIds = new Set(personal.values())

  const result: ParsedImport = { events: [], participants: [], errors: [], rows: 0, format: 'grid' }
  for (const { header, table, name } of sheets) {
    const own = personal.get(name)
    const where = name ? `Лист «${name}»: ` : ''
    let prevTime: string | undefined

    for (let r = header.row + 1; r < table.length; r++) {
      const cells = table[r] ?? []
      const filled = header.columns.filter((c) => !isBlank(cells[c.index]))
      if (!filled.length) continue

      const timeCell = cells[header.timeIndex]
      const rowTime = normalizeTime(typeof timeCell === 'string' ? timeCell.trim() : timeCell)
      if (!rowTime && !isBlank(timeCell)) {
        result.errors.push({ row: r + 1, message: `${where}Не понимаю время «${text(timeCell)}»` })
        continue
      }
      const time = rowTime ?? prevTime
      if (!time) {
        result.errors.push({ row: r + 1, message: `${where}Не указано время` })
        continue
      }
      prevTime = time
      const review = rowTime ? [] : [NO_TIME_NOTE]

      for (const col of filled) {
        const raw = text(cells[col.index])
        result.rows++
        try {
          if (col.notes) {
            if (own) continue
            const note = parseSelfNote(raw)
            if (!note) continue
            const id = roster.resolve(SELF).id
            const notes = [...(note.time ? [] : review), NOTE_REVIEW]
            result.events.push(build([id], col.day, note.time ?? time, NOTE_TITLE, undefined, notes, 'logistics'))
            continue
          }

          const parsed = parseCell(raw, time, roster.all().map((p) => p.name))
          if (!parsed.title) {
            result.errors.push({ row: r + 1, message: `${where}Пустое название в «${raw.replace(/\s+/g, ' ')}»` })
            continue
          }
          let ids = parsed.names.map((n) => roster.resolve(n).id)
          if (!ids.length) {
            if (own) ids = [own]
            else if (looksPersonal(raw)) ids = [roster.resolve(SELF).id]
            else {
              result.errors.push({ row: r + 1, message: `${where}Не указано, чей это пункт: «${raw.replace(/\s+/g, ' ')}»` })
              continue
            }
          } else if (!own) {
            ids = ids.filter((id) => !personalIds.has(id))
            if (!ids.length) continue
          }
          result.events.push(build(ids, col.day, time, parsed.title, parsed.end, [...review, ...(parsed.review ? [parsed.review] : [])]))
        } catch (err) {
          result.errors.push({ row: r + 1, message: `${where}${err instanceof ValidationError ? err.message : 'Строка не распознана'}` })
        }
      }
    }
  }
  result.participants = roster.created
  return result
}
