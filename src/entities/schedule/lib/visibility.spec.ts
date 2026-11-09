import { describe, expect, it } from 'vitest'

import { buildGrid } from './grid'
import { eventsVisibleInAll, occurrencesVisibleInAll, visibleInAll } from './visibility'
import { normalizeEvent } from './validation'
import { occurrences } from './occurrences'

import type { ScheduleEvent } from '../model/types'

const ev = (id: string, start: string, showInAll?: boolean): ScheduleEvent => ({
  id,
  participantIds: ['a'],
  day: 'mon',
  start,
  title: `T${id}`,
  category: 'activity',
  ...(showInAll === undefined ? {} : { showInAll }),
})

describe('visibleInAll', () => {
  it.each<[boolean | undefined, boolean]>([
    [undefined, true],
    [true, true],
    [false, false],
  ])('showInAll %s -> %s', (value, expected) => {
    expect(visibleInAll(ev('1', '08:00', value))).toBe(expected)
  })

  it('filters events and occurrences', () => {
    const list = [ev('1', '08:00'), ev('2', '09:00', false)]
    expect(eventsVisibleInAll(list).map((e) => e.id)).toEqual(['1'])
    const monday = new Date(2026, 0, 5)
    expect(occurrencesVisibleInAll(occurrences(list, monday, monday)).map((o) => o.event.id)).toEqual(['1'])
  })
})

describe('buildGrid with onlyVisibleInAll', () => {
  const list = [ev('1', '08:00'), ev('2', '09:00', false)]

  it('drops rows that only hold hidden events', () => {
    expect(buildGrid(list, { onlyVisibleInAll: true }).rows.map((r) => r.time)).toEqual(['08:00'])
  })

  it('keeps hidden events otherwise', () => {
    expect(buildGrid(list).rows.map((r) => r.time)).toEqual(['08:00', '09:00'])
    expect(buildGrid(list, { participantIds: ['a'] }).rows).toHaveLength(2)
  })
})

describe('normalizeEvent showInAll', () => {
  it.each<[unknown, boolean | undefined]>([
    [false, false],
    [true, undefined],
    [undefined, undefined],
    ['no', undefined],
    [0, undefined],
  ])('%j -> %j', (value, expected) => {
    const out = normalizeEvent({ ...ev('1', '08:00'), showInAll: value as boolean })
    expect(out.showInAll).toBe(expected)
    expect('showInAll' in out).toBe(expected !== undefined)
  })
})
