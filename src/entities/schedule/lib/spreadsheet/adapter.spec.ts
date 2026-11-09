import { describe, expect, it } from 'vitest'

import { decodeCsv, detectDelimiter, readSpreadsheet, writeSpreadsheet } from './adapter'
import { rowsToEvents } from './rows'

import type { Participant, ScheduleEvent } from '../../model/types'

const participants: Participant[] = [
  { id: 'anya', name: 'Аня', color: '#FCE8B2', order: 0 },
  { id: 'misha', name: 'Миша', color: '#CFE2FF', order: 1 },
]
const events: ScheduleEvent[] = [
  { id: '1', participantIds: ['anya', 'misha'], day: 'mon', start: '08:30', end: '09:15', title: 'Вокал', place: 'Студия', category: 'study', remindBefore: 15, note: 'Ноты; "красные"' },
  { id: '2', participantIds: ['misha'], date: '2026-03-08', start: '10:00', title: 'Концерт', category: 'activity', showInAll: false },
]
const expected = events.map((e) => {
  const copy: Partial<ScheduleEvent> = { ...e }
  delete copy.id
  return copy
})

const bytes = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsArrayBuffer(blob)
  })

function cp1251(text: string): ArrayBuffer {
  const out = [...text].map((ch) => {
    const code = ch.charCodeAt(0)
    if (code < 128) return code
    if (ch === 'Ё') return 0xa8
    if (ch === 'ё') return 0xb8
    return code - 0x410 + 0xc0
  })
  return new Uint8Array(out).buffer
}

describe.each(['xlsx', 'xls'] as const)('%s', (format) => {
  it('writes two sheets and reads them back', async () => {
    const blob = await writeSpreadsheet({ events, participants }, format)
    const XLSX = await import('xlsx')
    expect(XLSX.read(await bytes(blob), { type: 'array' }).SheetNames).toEqual(['Расписание', 'Участники'])

    const data = await readSpreadsheet(await bytes(blob), `file.${format}`)
    expect(data.participants).toEqual([['Имя', 'Цвет'], ['Аня', '#FCE8B2'], ['Миша', '#CFE2FF']])
    const parsed = rowsToEvents(data, participants)
    expect(parsed.errors).toEqual([])
    expect(parsed.events).toEqual(expected)
  })
})

describe('in-memory workbook with numeric cells', () => {
  it('reads Excel fractions and date serials', async () => {
    const XLSX = await import('xlsx')
    const sheet = XLSX.utils.aoa_to_sheet([
      ['Кто', 'Дата', 'С', 'Название'],
      ['Аня', 46089, 0.375, 'Дело'],
    ])
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, 'Лист1')
    const data = await readSpreadsheet(XLSX.write(book, { type: 'array', bookType: 'xlsx' }), 'x.xlsx')
    const parsed = rowsToEvents(data, participants)
    expect(parsed.events).toEqual([
      { participantIds: ['anya'], date: '2026-03-08', start: '09:00', title: 'Дело', category: 'activity' },
    ])
  })
})

describe('csv', () => {
  it('writes ; delimited text with a BOM and round-trips', async () => {
    const blob = await writeSpreadsheet({ events, participants }, 'csv')
    const buf = await bytes(blob)
    expect([...new Uint8Array(buf).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buf)
    expect(text.split('\n')[0]).toBe('﻿Участники;День;Дата;Начало;Окончание;Занятие;Место;Категория;Напоминание, мин;Во «Все»;Заметка')

    const parsed = rowsToEvents(await readSpreadsheet(buf, 'a.csv'), participants)
    expect(parsed.errors).toEqual([])
    expect(parsed.events).toEqual(expected)
  })

  it.each<[string, string]>([
    ['semicolon', 'Участник;День;Начало;Занятие\nАня;ПН;8:30;Вокал'],
    ['comma', 'Участник,День,Начало,Занятие\nАня,ПН,8:30,Вокал'],
    ['crlf and BOM', '﻿Участник;День;Начало;Занятие\r\nАня;ПН;8:30;Вокал\r\n'],
  ])('reads %s', async (_name, text) => {
    const buf = new TextEncoder().encode(text).buffer
    const parsed = rowsToEvents(await readSpreadsheet(buf, 'a.csv'), participants)
    expect(parsed.errors).toEqual([])
    expect(parsed.events).toEqual([{ participantIds: ['anya'], day: 'mon', start: '08:30', title: 'Вокал', category: 'activity' }])
  })

  it('falls back to windows-1251', async () => {
    const buf = cp1251('Участник;День;Начало;Занятие\nАня;ПН;8:30;Ёжик и чтение')
    expect(decodeCsv(new Uint8Array(buf))).toContain('Ёжик и чтение')
    const parsed = rowsToEvents(await readSpreadsheet(buf, 'old.csv'), participants)
    expect(parsed.errors).toEqual([])
    expect(parsed.events[0]).toMatchObject({ participantIds: ['anya'], title: 'Ёжик и чтение' })
  })

  it.each<[string, ';' | ',' | '\t']>([
    ['a;b;c', ';'],
    ['a,b,c', ','],
    ['a\tb\tc', '\t'],
    ['"a,b";c;d', ';'],
    ['abc', ';'],
  ])('detects delimiter in %j', (line, expectedDelimiter) => {
    expect(detectDelimiter(line)).toBe(expectedDelimiter)
  })
})
