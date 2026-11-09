import { describe, expect, it } from 'vitest'

import { PASTEL_COLORS } from '../../config'

import { eventsToRows, rowsToEvents } from './rows'

import type { Participant, ScheduleEvent } from '../../model/types'

const people: Participant[] = [
  { id: 'anya', name: 'Аня', color: PASTEL_COLORS[0]!, order: 0 },
  { id: 'misha', name: 'Миша', color: PASTEL_COLORS[1]!, order: 1 },
]

const HEADER = ['Участники', 'День', 'Дата', 'Начало', 'Окончание', 'Занятие', 'Место', 'Категория', 'Напоминание, мин', 'Во «Все»', 'Заметка']

const parse = (rows: unknown[][], existing = people) => rowsToEvents({ events: rows }, existing)

describe('round trip', () => {
  const events: ScheduleEvent[] = [
    { id: '1', participantIds: ['anya', 'misha'], day: 'mon', start: '08:30', end: '09:15', title: 'Вокал', place: 'Студия', category: 'study', remindBefore: 15, note: 'Взять ноты' },
    { id: '2', participantIds: ['misha'], date: '2026-03-08', start: '10:00', title: 'Концерт', category: 'activity', showInAll: false },
    { id: '3', participantIds: ['anya'], day: 'sun', start: '19:00', title: 'Режим', category: 'routine', remindBefore: 0 },
  ]

  it('export then import yields the same events', () => {
    const { events: rows, participants } = eventsToRows(events, people)
    const parsed = rowsToEvents({ events: rows, participants }, people)
    expect(parsed.errors).toEqual([])
    expect(parsed.participants).toEqual([])
    expect(parsed.events).toEqual(
      events.map((e) => {
        const copy: Partial<ScheduleEvent> = { ...e }
        delete copy.id
        return copy
      }),
    )
  })

  it('uses short day labels and Russian dates', () => {
    const { events: rows } = eventsToRows(events, people)
    expect(rows[0]).toEqual(HEADER)
    expect(rows[1]?.slice(0, 4)).toEqual(['Аня, Миша', 'ПН', '', '08:30'])
    expect(rows[2]?.slice(1, 3)).toEqual(['ВС', '08.03.2026'])
    expect(rows[2]?.[9]).toBe('нет')
  })
})

describe('headers and values', () => {
  it('accepts aliases regardless of case and spacing', () => {
    const res = parse([
      [' КТО ', 'День недели', 'Время', 'до', 'Название'],
      ['аня', 'Понедельник', '8.30', '9:00', 'вокал'],
    ])
    expect(res.errors).toEqual([])
    expect(res.events[0]).toMatchObject({ participantIds: ['anya'], day: 'mon', start: '08:30', end: '09:00', title: 'Вокал' })
  })

  it.each<[unknown, string]>([
    [0.375, '09:00'],
    [0.5, '12:00'],
    [46000.75, '18:00'],
    [830, '08:30'],
    ['8-30', '08:30'],
    [new Date(2026, 0, 1, 7, 5), '07:05'],
  ])('time %j -> %s', (cell, expected) => {
    const res = parse([HEADER, ['Аня', 'ВТ', '', cell, '', 'Дело', '', '', '', '', '']])
    expect(res.events[0]?.start).toBe(expected)
  })

  it.each<[unknown, string]>([
    ['08.03.2026', '2026-03-08'],
    ['8.3.26', '2026-03-08'],
    ['2026-03-08', '2026-03-08'],
    [46089, '2026-03-08'],
    [new Date(2026, 2, 8), '2026-03-08'],
  ])('date %j -> %s', (cell, expected) => {
    const res = parse([HEADER, ['Аня', '', cell, '9:00', '', 'Дело', '', '', '', '', '']])
    expect(res.events[0]).toMatchObject({ date: expected })
    expect(res.events[0]?.day).toBeUndefined()
  })

  it.each<[string, string[]]>([
    ['ПН', ['mon']],
    ['воскр', ['sun']],
    ['пн, ср', ['mon', 'wed']],
    ['ПН-ПТ', ['mon', 'tue', 'wed', 'thu', 'fri']],
    ['суббота', ['sat']],
  ])('day %s expands to %j', (cell, days) => {
    const res = parse([HEADER, ['Аня', cell, '', '9:00', '', 'Дело', '', '', '', '', '']])
    expect(res.events.map((e) => e.day)).toEqual(days)
  })

  it.each<[string, string, string]>([
    ['Учёба', 'study', ''],
    ['дорога', 'logistics', ''],
    ['', 'activity', ''],
    ['хобби', 'activity', 'Категория «хобби» не распознана'],
  ])('category %j -> %s', (cell, category, review) => {
    const res = parse([HEADER, ['Аня', 'ПН', '', '9:00', '', 'Дело', '', cell, '', '', '']])
    expect(res.events[0]?.category).toBe(category)
    expect(res.events[0]?.needsReview ?? '').toContain(review)
    expect(Boolean(res.events[0]?.needsReview)).toBe(review !== '')
  })

  it('flags assumptions with needsReview', () => {
    const res = parse([HEADER, ['Аня', 'ПН', '09.03.2026', '10:00', '09:00', 'Дело', '', '', 'abc', '', '']])
    expect(res.events[0]?.date).toBe('2026-03-09')
    expect(res.events[0]?.end).toBeUndefined()
    expect(res.events[0]?.needsReview).toContain('раньше начала')
    expect(res.events[0]?.needsReview).toContain('Напоминание «abc»')
  })

  it.each([['нет'], ['No'], ['0']])('hides on %s', (cell) => {
    const res = parse([HEADER, ['Аня', 'ПН', '', '9:00', '', 'Дело', '', '', '', cell, '']])
    expect(res.events[0]?.showInAll).toBe(false)
  })
})

describe('participants', () => {
  it('creates unknown participants on the next free pastel color', () => {
    const res = parse([HEADER, ['Аня, Боря', 'ПН', '', '9:00', '', 'Дело', '', '', '', '', ''], ['боря; Вера', 'ВТ', '', '9:00', '', 'Дело', '', '', '', '', '']])
    expect(res.participants).toEqual([
      { id: 'borya', name: 'Боря', color: PASTEL_COLORS[2], order: 2 },
      { id: 'vera', name: 'Вера', color: PASTEL_COLORS[3], order: 3 },
    ])
    expect(res.events[0]?.participantIds).toEqual(['anya', 'borya'])
    expect(res.events[1]?.participantIds).toEqual(['borya', 'vera'])
  })

  it('takes colors from the participants sheet but keeps existing ones', () => {
    const res = rowsToEvents(
      {
        events: [HEADER, ['Боря', 'ПН', '', '9:00', '', 'Дело', '', '', '', '', '']],
        participants: [['Имя', 'Цвет'], ['Боря', '#abc'], ['Аня', '#000000']],
      },
      people,
    )
    expect(res.participants.map((p) => [p.name, p.color])).toEqual([['Боря', '#AABBCC']])
  })

  it('does not create participants for rejected rows', () => {
    const res = parse([HEADER, ['Боря', 'ПН', '', 'abc', '', 'Дело', '', '', '', '', '']])
    expect(res.participants).toEqual([])
  })
})

describe('errors', () => {
  it('reports bad rows with sheet row numbers and skips blanks', () => {
    const res = parse([
      HEADER,
      ['Аня', 'ПН', '', '9:00', '', 'Ок', '', '', '', '', ''],
      ['', '', '', '', '', '', '', '', '', '', ''],
      ['', 'ПН', '', '9:00', '', 'Без участника', '', '', '', '', ''],
      ['Аня', 'ПН', '', '25:70', '', 'Время', '', '', '', '', ''],
      ['Аня', 'зюзя', '', '9:00', '', 'День', '', '', '', '', ''],
      ['Аня', '', '', '9:00', '', 'Без дня', '', '', '', '', ''],
      ['Аня', 'ПН', '', '9:00', '', '', '', '', '', '', ''],
      ['Аня', '', '31.02.2026', '9:00', '', 'Дата', '', '', '', '', ''],
    ])
    expect(res.events).toHaveLength(1)
    expect(res.rows).toBe(7)
    expect(res.errors).toEqual([
      { row: 4, message: 'Не указан участник' },
      { row: 5, message: 'Начало: Время 25:70 не существует' },
      { row: 6, message: 'Неизвестный день недели «зюзя»' },
      { row: 7, message: 'Укажите день недели или дату' },
      { row: 8, message: 'Не указано название занятия' },
      { row: 9, message: 'Дата «31.02.2026» указана неверно' },
    ])
  })

  it.each<[string, unknown[][], string]>([
    ['no header', [['1', '2'], ['3', '4']], 'Не найдена строка заголовков'],
    ['missing columns', [['Участники', 'День']], 'Не найден столбец: Начало, Занятие'],
  ])('%s', (_name, rows, message) => {
    const res = parse(rows)
    expect(res.events).toEqual([])
    expect(res.errors[0]?.message).toContain(message)
  })
})
