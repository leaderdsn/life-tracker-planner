import { EVENTS_SHEET, GUIDE_SHEET, PARTICIPANTS_SHEET } from './columns'
import { eventsToRows } from './rows'
import type { SpreadsheetData } from './rows'

import type { WorkSheet } from 'xlsx'

import type { Participant, ScheduleEvent } from '../../model/types'

export type SpreadsheetFormat = 'xlsx' | 'xls' | 'csv'

const MIME: Record<SpreadsheetFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv;charset=utf-8',
}

const BOM = '﻿'

/** UTF-8 first; bytes that are not valid UTF-8 are treated as windows-1251. */
export function decodeCsv(bytes: Uint8Array): string {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    text = new TextDecoder('windows-1251').decode(bytes)
  }
  return text.replace(/^﻿/, '')
}

export function detectDelimiter(text: string): ';' | ',' | '\t' {
  const first = text.split(/\r?\n/, 1)[0] ?? ''
  const count = { ';': 0, ',': 0, '\t': 0 }
  let quoted = false
  for (const ch of first) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && ch in count) count[ch as keyof typeof count]++
  }
  if (count[';'] >= count[','] && count[';'] >= count['\t']) return ';'
  return count[','] >= count['\t'] ? ',' : '\t'
}

const extensionOf = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? ''

async function bytesOf(input: File | ArrayBuffer | Blob): Promise<Uint8Array> {
  if ('byteLength' in input) return new Uint8Array(input)
  if ('arrayBuffer' in input) return new Uint8Array(await input.arrayBuffer())
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer))
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать файл'))
    reader.readAsArrayBuffer(input)
  })
}

export async function readSpreadsheet(input: File | ArrayBuffer, name: string): Promise<SpreadsheetData> {
  const XLSX = await import('xlsx')
  const bytes = await bytesOf(input)
  const toTable = (sheet: WorkSheet | undefined) =>
    sheet ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: '', blankrows: true }) : undefined

  if (extensionOf(name) === 'csv' || extensionOf(name) === 'txt') {
    const text = decodeCsv(bytes)
    const book = XLSX.read(text, { type: 'string', raw: true, FS: detectDelimiter(text) })
    return { events: toTable(book.Sheets[book.SheetNames[0] ?? '']) ?? [] }
  }

  const book = XLSX.read(bytes, { type: 'array' })
  const first = book.SheetNames[0] ?? ''
  const events = toTable(book.Sheets[EVENTS_SHEET] ?? book.Sheets[first])
  const participantsName = book.SheetNames.find((n) => n.trim().toLowerCase() === PARTICIPANTS_SHEET.toLowerCase())
  const participants = participantsName && participantsName !== first ? toTable(book.Sheets[participantsName]) : undefined
  const sheets = book.SheetNames.filter((n) => n.trim().toLowerCase() !== GUIDE_SHEET.toLowerCase()).map((n) => ({ name: n, table: toTable(book.Sheets[n]) ?? [] }))
  return { events: events ?? [], ...(participants ? { participants } : {}), sheets }
}

export async function writeSpreadsheet(
  snapshot: { events: ScheduleEvent[]; participants: Participant[] },
  format: SpreadsheetFormat,
): Promise<Blob> {
  const XLSX = await import('xlsx')
  const rows = eventsToRows(snapshot.events, snapshot.participants)
  const events = XLSX.utils.aoa_to_sheet(rows.events)
  events['!cols'] = [22, 7, 12, 8, 10, 30, 18, 12, 10, 8, 30].map((wch) => ({ wch }))

  if (format === 'csv') {
    return new Blob([BOM + XLSX.utils.sheet_to_csv(events, { FS: ';' })], { type: MIME.csv })
  }

  const participants = XLSX.utils.aoa_to_sheet(rows.participants)
  participants['!cols'] = [{ wch: 22 }, { wch: 10 }]
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, events, EVENTS_SHEET)
  XLSX.utils.book_append_sheet(book, participants, PARTICIPANTS_SHEET)
  const out: ArrayBuffer = XLSX.write(book, { type: 'array', bookType: format === 'xls' ? 'biff8' : 'xlsx' })
  return new Blob([out], { type: MIME[format] })
}
