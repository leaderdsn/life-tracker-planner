import { describe, expect, it } from 'vitest'

import { findGridHeader, parseCell, parseSelfNote } from './grid'
import { rowsToEvents } from './rows'

import type { Table } from './rows'

const NAMES = ['Петя', 'Миша', 'Катя']

describe('findGridHeader', () => {
  it.each([
    [[['Время', 'ПН', 'ВТ']], true],
    [[['x'], ['время', 'Понедельник', 'вторник', 'ср']], true],
    [[['Время', 'ПН']], false],
    [[['ПН', 'ВТ', 'СР']], false],
  ] as [Table, boolean][])('%j -> %s', (table, ok) => {
    expect(findGridHeader(table) !== null).toBe(ok)
  })

  it('marks a lowercase column after its day as notes and keeps duplicate days', () => {
    const h = findGridHeader([['Время', 'ПН', 'пн', 'СР', 'СР', 'Время']])!
    expect(h.columns.map((c) => [c.day, c.notes])).toEqual([['mon', false], ['mon', true], ['wed', false], ['wed', false]])
  })
})

describe('parseCell', () => {
  it.each([
    ['ШАХМАТЫ (Пе,Ми) Студия, до 11.00', '08:00', 'Шахматы Студия', '11:00', ['Петя', 'Миша']],
    ['Алгебра (до 10:40)', '08:00', 'Алгебра', '10:40', []],
    ['АНГЛИЙСКИЙ ШКОЛА\n(Миша)до 11:25', '08:00', 'Английский школа', '11:25', ['Миша']],
    ['ТАНЦЫ (Пе,Ми),до10.30', '08:00', 'Танцы', '10:30', ['Петя', 'Миша']],
    ['ХУДОЖКА(Ка) до 18/40', '08:00', 'Художка', '18:40', ['Катя']],
    ['ХУДОЖКА(Кат)\nДО 15.30', '08:00', 'Художка', '15:30', ['Катя']],
    ['Бассейн (тренер)', '08:00', 'Бассейн (тренер)', undefined, []],
  ])('%j', (raw, start, title, end, names) => {
    const cell = parseCell(raw, start, NAMES)
    expect(cell.title.toLowerCase()).toBe(title.toLowerCase())
    expect(cell.end).toBe(end)
    expect(cell.names).toEqual(names)
  })

  it('drops an end that is not after the start', () => {
    const cell = parseCell('Урок до 9.00', '10:00', NAMES)
    expect(cell.end).toBeUndefined()
    expect(cell.review).toBe('Окончание раньше начала — проверьте')
  })
})

describe('parseSelfNote', () => {
  it.each([
    ['←я в13.40', { time: '13:40' }],
    ['←я к15.00', { time: '15:00' }],
    ['← я', {}],
    ['←муж', null],
    ['просто я', null],
  ])('%j', (raw, expected) => {
    expect(parseSelfNote(raw)).toEqual(expected)
  })
})

const summary: Table = [
  ['Время', 'ПН', 'пн', 'ВТ', 'вт', 'Время'],
  ['8.30', 'ШАХМАТЫ (Пе,Ми) до 11.00', '←я в13.40', 'БАЯН (Петя)', '←муж'],
  ['', 'МОЯ РАБОТА', '', 'ХУДОЖКА(Ка)\nдо 15.50', ''],
  [0.375, '', '←я', 'идут к родителям', ''],
]
const personal = (): Table => [['Время', 'ПН', 'ВТ', 'СР', 'СР'], ['9.00 ', 'Алгебра (до 10:40)', '', '', 'Чтение'], ['', '', 'Музыка', '', '']]

describe('rowsToEvents grid', () => {
  const sheets = [
    { name: 'общее по секциям', table: summary },
    { name: 'Петя', table: personal() },
    { name: 'Миша', table: personal() },
  ]
  const result = rowsToEvents({ events: summary, sheets }, [{ id: 'va', name: 'Катя', color: '#FFD6E0', order: 0 }])
  const byName = (name: string) => {
    const id = [...result.participants, { id: 'va', name: 'Катя' }].find((p) => p.name === name)?.id
    return result.events.filter((e) => e.participantIds.includes(id!))
  }

  it('reports the grid format', () => {
    expect(result.format).toBe('grid')
  })

  it('imports personal sheets fully, with duplicate day columns and inherited time', () => {
    const r = byName('Петя').filter((e) => e.day === 'wed' || e.title === 'Алгебра' || e.title === 'Музыка')
    expect(r.map((e) => [e.title, e.day, e.start, e.end])).toEqual([
      ['Алгебра', 'mon', '09:00', '10:40'],
      ['Чтение', 'wed', '09:00', undefined],
      ['Музыка', 'tue', '09:00', undefined],
    ])
    expect(r[2]!.needsReview).toBe('Время не указано в таблице')
  })

  it('skips summary cells already covered by personal sheets', () => {
    expect(result.events.some((e) => e.title === 'Шахматы')).toBe(false)
    expect(result.events.some((e) => e.title === 'Баян')).toBe(false)
  })

  it('keeps summary cells of participants without a personal sheet', () => {
    const v = byName('Катя')
    expect(v.map((e) => [e.title, e.day, e.start, e.end])).toEqual([['Художка', 'tue', '08:30', '15:50']])
  })

  it('turns self notes and personal items into events for Я', () => {
    expect(byName('Я').map((e) => [e.title, e.day, e.start, e.needsReview])).toEqual([
      ['Отвезти/забрать детей', 'mon', '13:40', 'Пометка из таблицы — проверьте'],
      ['Моя работа', 'mon', '08:30', 'Время не указано в таблице'],
      ['Отвезти/забрать детей', 'mon', '09:00', 'Пометка из таблицы — проверьте'],
    ])
  })

  it('reports cells without an owner', () => {
    expect(result.errors.map((e) => e.message)).toEqual([expect.stringContaining('«идут к родителям»')])
  })
})
