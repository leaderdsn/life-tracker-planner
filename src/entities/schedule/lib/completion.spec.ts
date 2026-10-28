import { describe, expect, it } from 'vitest'

import { effectiveCompletion, effectiveCompletionFor } from './completion'
import { progress } from './progress'

import type { Completion, Occurrence } from '../model/types'

const MIN = 60_000
const T0 = new Date(2026, 0, 5, 9, 0).getTime()
const DATE = '2026-01-05'

const occ = (id: string, startMin: number, endMin: number, participantIds = ['a']): Occurrence => ({
  event: { id, participantIds, day: 'mon', start: '09:00', title: id, category: 'activity' },
  date: DATE,
  startAt: T0 + startMin * MIN,
  endAt: T0 + endMin * MIN,
})

const first = occ('first', 0, 30)
const second = occ('second', 60, 90)
const day = [first, second]
const at = (min: number) => T0 + min * MIN

describe('effectiveCompletion', () => {
  it.each<[string, Occurrence, number, boolean, Completion[], string | null]>([
    ['before the next one starts', first, 59, true, [], null],
    ['exactly when the next one starts', first, 60, true, [], 'auto'],
    ['after the next one started', first, 120, true, [], 'auto'],
    ['last one before its end', second, 89, true, [], null],
    ['last one exactly at its end', second, 90, true, [], 'auto'],
    ['setting off means no auto', first, 500, false, [], null],
    ['explicit skipped beats auto', first, 500, true, [{ eventId: 'first', date: DATE, status: 'skipped' }], 'skipped'],
    ['explicit done before auto time', first, 10, true, [{ eventId: 'first', date: DATE, status: 'done' }], 'done'],
    ['explicit done with the setting off', first, 10, false, [{ eventId: 'first', date: DATE, status: 'done' }], 'done'],
  ])('%s', (_name, o, nowMin, auto, completions, expected) => {
    expect(effectiveCompletion(o, day, completions, auto, at(nowMin))).toBe(expected)
  })

  it('judges a shared event per participant', () => {
    const shared = occ('shared', 0, 30, ['a', 'b'])
    const bOnly = occ('b-next', 40, 70, ['b'])
    const all = [shared, bOnly]
    const now = at(35)
    expect(effectiveCompletionFor(shared, 'a', all, [], true, now)).toBe('auto')
    expect(effectiveCompletionFor(shared, 'b', all, [], true, now)).toBeNull()
    expect(effectiveCompletionFor(shared, 'b', all, [], true, at(40))).toBe('auto')
  })
})

describe('progress with auto-complete', () => {
  const all = [first, second]
  it.each<[string, boolean, number, number]>([
    ['off', false, 500, 0],
    ['on, between events', true, 70, 1],
    ['on, after the day', true, 500, 2],
  ])('%s', (_name, autoComplete, nowMin, done) => {
    expect(progress([], all, ['a'], { autoComplete, now: at(nowMin) }).a).toEqual({ done, total: 2 })
  })

  it('skipped stays not done', () => {
    const skipped: Completion[] = [{ eventId: 'first', date: DATE, status: 'skipped' }]
    expect(progress(skipped, all, ['a'], { autoComplete: true, now: at(500) }).a).toEqual({ done: 1, total: 2 })
  })
})
