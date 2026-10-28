import { describe, expect, it } from 'vitest'

import { parseIsoDate } from '@/shared/lib'

import { buildGrid, eventsForWeek } from './grid'

import type { ScheduleEvent } from '../model/types'

const ev = (id: string, patch: Partial<ScheduleEvent>): ScheduleEvent => ({
  id,
  participantIds: ['a'],
  day: 'mon',
  start: '08:00',
  title: id,
  category: 'activity',
  ...patch,
})

describe('buildGrid', () => {
  const events = [
    ev('a1', { start: '14:00', day: 'tue' }),
    ev('a2', { start: '09:00', day: 'mon' }),
    ev('b1', { start: '09:00', day: 'mon', participantIds: ['b'], title: 'Aaa' }),
    ev('c1', { start: '09:00', day: 'mon', participantIds: ['a', 'b'], title: 'Zzz' }),
  ]

  it('builds sorted unique rows and sorts cell events by title', () => {
    const grid = buildGrid(events)
    expect(grid.rows.map((r) => r.time)).toEqual(['09:00', '14:00'])
    expect(grid.rows[0]?.cells.mon?.map((e) => e.title)).toEqual(['a2', 'Aaa', 'Zzz'])
  })

  it('filters by participant', () => {
    const grid = buildGrid(events, { participantIds: ['b'] })
    expect(grid.rows).toHaveLength(1)
    expect(grid.rows[0]?.cells.mon?.map((e) => e.id)).toEqual(['b1', 'c1'])
  })

  it('removes the 14:00 row when its only event is deleted', () => {
    expect(buildGrid(events).rows.map((r) => r.time)).toContain('14:00')
    const rest = events.filter((e) => e.start !== '14:00')
    expect(buildGrid(rest).rows.map((r) => r.time)).not.toContain('14:00')
  })

  it('makes a new 07:15 event the first row', () => {
    const grid = buildGrid([...events, ev('n', { start: '07:15' })])
    expect(grid.rows[0]?.time).toBe('07:15')
  })

  it.each<[string, ScheduleEvent[], Parameters<typeof buildGrid>[1], string[]]>([
    ['hides empty sunday', events, undefined, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat']],
    ['shows sunday with events', [...events, ev('s', { day: 'sun' })], undefined, ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']],
    ['respects explicit days', events, { days: ['mon', 'sun'] }, ['mon', 'sun']],
  ])('days: %s', (_name, list, options, expected) => {
    expect(buildGrid(list, options).days).toEqual(expected)
  })

  it('returns no rows for no events', () => {
    expect(buildGrid([]).rows).toEqual([])
  })
})

describe('eventsForWeek', () => {
  const weekly = ev('w', { day: 'wed' })
  const oneOff = (id: string, date: string) => ev(id, { day: undefined, date })
  const monday = parseIsoDate('2024-03-04')

  it('includes weekly events and one-offs inside the week with their weekday', () => {
    const res = eventsForWeek([weekly, oneOff('in', '2024-03-10'), oneOff('first', '2024-03-04')], monday)
    expect(res.map((e) => [e.id, e.day])).toEqual([
      ['w', 'wed'],
      ['in', 'sun'],
      ['first', 'mon'],
    ])
  })

  it.each([['2024-03-03'], ['2024-03-11']])('excludes one-off on %s', (date) => {
    expect(eventsForWeek([oneOff('out', date)], monday)).toEqual([])
  })
})
