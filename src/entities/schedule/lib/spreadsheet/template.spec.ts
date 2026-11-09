import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { readSpreadsheet } from './adapter'
import { EVENT_HEADERS, COLUMN_ORDER, EVENTS_SHEET } from './columns'
import { rowsToEvents } from './rows'

const file = resolve(process.cwd(), 'public/templates/raspisanie-shablon.xlsx')
const buffer = () => {
  const bytes = readFileSync(file)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}

describe('xlsx template', () => {
  it('is recognized and imports as empty', async () => {
    const data = await readSpreadsheet(buffer(), 'raspisanie-shablon.xlsx')
    expect(data.events[0]).toEqual(COLUMN_ORDER.map((c) => EVENT_HEADERS[c]))
    const parsed = rowsToEvents(data)
    expect(parsed.errors).toEqual([])
    expect(parsed.events).toEqual([])
    expect(parsed.rows).toBe(0)
  })

  it('imports a filled copy without errors', async () => {
    const data = await readSpreadsheet(buffer(), 'raspisanie-shablon.xlsx')
    expect(data.sheets?.map((s) => s.name)).not.toContain('Как заполнять')
    const filled = {
      ...data,
      events: [
        ...data.events,
        ['Аня, Миша', 'ПН', '', '8:30', '9.15', 'Вокал', 'Студия', 'Учёба', 5, 'да', ''],
        ['Миша', '', '08.03.2026', '10:00', '', 'Концерт', '', 'Занятие', '', 'нет', 'Взять форму'],
      ],
    }
    const parsed = rowsToEvents(filled)
    expect(parsed.errors).toEqual([])
    expect(parsed.events).toHaveLength(2)
    expect(parsed.events[0]).toMatchObject({ day: 'mon', start: '08:30', end: '09:15', category: 'study', remindBefore: 5 })
    expect(parsed.events[1]).toMatchObject({ date: '2026-03-08', start: '10:00', showInAll: false })
    expect(EVENTS_SHEET).toBe('Расписание')
  })
})
