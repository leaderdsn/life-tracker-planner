import { describe, expect, it } from 'vitest'

import { findConflicts } from './conflicts'

import type { ScheduleEvent } from '../model/types'

const ev = (id: string, start: string, end?: string, patch: Partial<ScheduleEvent> = {}): ScheduleEvent => ({
  id,
  participantIds: ['a'],
  day: 'mon',
  start,
  end,
  title: id,
  category: 'activity',
  ...patch,
})

describe('findConflicts', () => {
  it.each<[string, ScheduleEvent[], string[][]]>([
    ['overlap', [ev('x', '09:00', '10:00'), ev('y', '09:30', '10:30')], [['x', 'y']]],
    ['touching ranges do not conflict', [ev('x', '09:00', '10:00'), ev('y', '10:00', '11:00')], []],
    ['missing end is 30 minutes', [ev('x', '09:00'), ev('y', '09:29', '10:00')], [['x', 'y']]],
    ['missing end, no overlap', [ev('x', '09:00'), ev('y', '09:30', '10:00')], []],
    ['different participants', [ev('x', '09:00', '10:00'), ev('y', '09:00', '10:00', { participantIds: ['b'] })], []],
    ['different days', [ev('x', '09:00', '10:00'), ev('y', '09:00', '10:00', { day: 'tue' })], []],
    [
      'one-offs on the same date',
      [
        ev('x', '09:00', '10:00', { day: undefined, date: '2024-03-05' }),
        ev('y', '09:30', '10:00', { day: undefined, date: '2024-03-05' }),
      ],
      [['x', 'y']],
    ],
    [
      'one-offs on different dates',
      [
        ev('x', '09:00', '10:00', { day: undefined, date: '2024-03-05' }),
        ev('y', '09:30', '10:00', { day: undefined, date: '2024-03-06' }),
      ],
      [],
    ],
  ])('%s', (_name, events, expected) => {
    expect(findConflicts(events).map((c) => c.eventIds)).toEqual(expected)
  })

  it('reports the shared participant and day', () => {
    const res = findConflicts([
      ev('x', '09:00', '10:00', { participantIds: ['a', 'b'] }),
      ev('y', '09:30', '10:00', { participantIds: ['b'] }),
    ])
    expect(res).toEqual([{ participantId: 'b', eventIds: ['x', 'y'], day: 'mon' }])
  })
})
