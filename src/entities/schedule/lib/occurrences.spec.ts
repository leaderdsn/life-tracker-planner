import { describe, expect, it } from 'vitest'

import { parseIsoDate, toIsoDate } from '@/shared/lib'

import { eventStatus, occurrences, periodRange } from './occurrences'

import type { Occurrence, ScheduleEvent } from '../model/types'

const ev = (id: string, patch: Partial<ScheduleEvent>): ScheduleEvent => ({
  id,
  participantIds: ['a'],
  day: 'mon',
  start: '09:00',
  title: id,
  category: 'activity',
  ...patch,
})

const at = (date: string, time: string) => {
  const [h = 0, m = 0] = time.split(':').map(Number)
  const d = parseIsoDate(date)
  d.setHours(h, m)
  return d.getTime()
}

describe('occurrences', () => {
  const from = parseIsoDate('2024-03-04')
  const to = parseIsoDate('2024-03-11')

  it('expands weekly events over the inclusive range, sorted by start', () => {
    const res = occurrences([ev('late', { start: '10:00' }), ev('early', { start: '08:00' })], from, to)
    expect(res.map((o) => [o.event.id, o.date])).toEqual([
      ['early', '2024-03-04'],
      ['late', '2024-03-04'],
      ['early', '2024-03-11'],
      ['late', '2024-03-11'],
    ])
  })

  it('includes one-offs on the boundary dates only once', () => {
    const e = ev('x', { day: undefined, date: '2024-03-11' })
    expect(occurrences([e], from, to)).toHaveLength(1)
    expect(occurrences([ev('y', { day: undefined, date: '2024-03-12' })], from, to)).toEqual([])
  })

  it.each([
    ['explicit end', '09:00', '10:30', 90],
    ['default 30 minutes', '09:00', undefined, 30],
  ])('computes endAt: %s', (_name, start, end, minutesLong) => {
    const [occ] = occurrences([ev('x', { start, end })], from, from)
    expect(occ?.startAt).toBe(at('2024-03-04', start))
    expect((occ?.endAt ?? 0) - (occ?.startAt ?? 0)).toBe(minutesLong * 60_000)
  })
})

describe('eventStatus', () => {
  const date = '2024-03-04'
  const day = parseIsoDate(date)
  const list = occurrences(
    [
      ev('one', { start: '09:00', end: '10:00' }),
      ev('two', { start: '11:00', end: '12:00' }),
      ev('three', { start: '13:00', end: '14:00' }),
      ev('other', { start: '11:30', end: '12:00', participantIds: ['b'] }),
    ],
    day,
    day,
  )
  const get = (id: string) => list.find((o) => o.event.id === id) as Occurrence

  it.each([
    ['09:30', { one: 'current', two: 'next', three: 'upcoming', other: 'next' }],
    ['10:00', { one: 'past', two: 'next', three: 'upcoming', other: 'next' }],
    ['12:30', { one: 'past', two: 'past', three: 'next', other: 'past' }],
    ['14:00', { one: 'past', two: 'past', three: 'past', other: 'past' }],
  ])('at %s', (time, expected) => {
    const now = at(date, time)
    for (const [id, status] of Object.entries(expected)) {
      expect(eventStatus(get(id), list, now)).toBe(status)
    }
  })
})

describe('periodRange', () => {
  const iso = (r: { from: Date; to: Date }) => [toIsoDate(r.from), toIsoDate(r.to)]
  it.each([
    ['day', '2024-03-06', ['2024-03-06', '2024-03-06']],
    ['week', '2024-03-06', ['2024-03-04', '2024-03-10']],
    ['week', '2024-03-10', ['2024-03-04', '2024-03-10']],
    ['month', '2024-02-15', ['2024-02-01', '2024-02-29']],
    ['month', '2024-12-31', ['2024-12-01', '2024-12-31']],
  ] as const)('%s of %s', (period, anchor, expected) => {
    expect(iso(periodRange(period, parseIsoDate(anchor)))).toEqual(expected)
  })
})
