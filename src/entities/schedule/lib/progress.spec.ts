import { describe, expect, it } from 'vitest'

import { progress } from './progress'

import type { Completion, Occurrence } from '../model/types'

const occ = (id: string, date: string, participantIds: string[]): Occurrence => ({
  event: { id, participantIds, day: 'mon', start: '09:00', title: id, category: 'activity' },
  date,
  startAt: 0,
  endAt: 1,
})

describe('progress', () => {
  const occs = [occ('x', '2024-03-04', ['a']), occ('y', '2024-03-04', ['a', 'b']), occ('x', '2024-03-11', ['a'])]

  it.each<[string, Completion[], Record<string, { done: number; total: number }>]>([
    ['nothing done', [], { a: { done: 0, total: 3 }, b: { done: 0, total: 1 } }],
    [
      'shared event counts for each participant',
      [{ eventId: 'y', date: '2024-03-04', status: 'done' }],
      { a: { done: 1, total: 3 }, b: { done: 1, total: 1 } },
    ],
    [
      'only the matching date counts',
      [{ eventId: 'x', date: '2024-03-11', status: 'done' }],
      { a: { done: 1, total: 3 }, b: { done: 0, total: 1 } },
    ],
    [
      'skipped is not done',
      [{ eventId: 'x', date: '2024-03-04', status: 'skipped' }],
      { a: { done: 0, total: 3 }, b: { done: 0, total: 1 } },
    ],
  ])('%s', (_name, completions, expected) => {
    expect(progress(completions, occs, ['a', 'b'])).toEqual(expected)
  })

  it('limits to requested participants and zero-fills', () => {
    expect(progress([], occs, ['b', 'c'])).toEqual({ b: { done: 0, total: 1 }, c: { done: 0, total: 0 } })
  })
})
