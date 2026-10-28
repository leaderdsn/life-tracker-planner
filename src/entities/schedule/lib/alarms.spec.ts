import { describe, expect, it } from 'vitest'

import { activeAlarms, alarmKey, pruneAcks } from './alarms'

import type { AlarmAck, Occurrence } from '../model/types'

const MIN = 60_000
const T0 = new Date(2026, 0, 5, 10, 0).getTime()

const occ = (id: string, startAt: number, endAt = startAt + 30 * MIN, remindBefore?: number): Occurrence => ({
  event: { id, participantIds: ['a'], day: 'mon', start: '10:00', title: id, category: 'activity', remindBefore },
  date: '2026-01-05',
  startAt,
  endAt,
})

const settings = { guestAlarmLead: 30 }
const ids = (list: Occurrence[]) => list.map((o) => o.event.id)

describe('activeAlarms', () => {
  it.each<[string, number, string[]]>([
    ['before the lead window', T0 - 31 * MIN, []],
    ['exactly at start - lead', T0 - 30 * MIN, ['e']],
    ['inside the lead window', T0 - 5 * MIN, ['e']],
    ['during the event', T0 + 10 * MIN, ['e']],
    ['exactly at end', T0 + 30 * MIN, []],
    ['after the end', T0 + 31 * MIN, []],
  ])('%s', (_name, now, expected) => {
    expect(ids(activeAlarms([occ('e', T0)], {}, settings, now))).toEqual(expected)
  })

  it.each<[string, number | undefined, number, string[]]>([
    ['override shortens the lead', 5, T0 - 10 * MIN, []],
    ['override applies', 5, T0 - 5 * MIN, ['e']],
    ['override longer than default', 60, T0 - 45 * MIN, ['e']],
    ['zero override before start', 0, T0 - MIN, []],
    ['zero override at start', 0, T0, ['e']],
    ['no override uses the setting', undefined, T0 - 30 * MIN, ['e']],
  ])('per-event remindBefore: %s', (_name, remindBefore, now, expected) => {
    expect(ids(activeAlarms([occ('e', T0, undefined, remindBefore)], {}, settings, now))).toEqual(expected)
  })

  it('excludes acknowledged occurrences', () => {
    const acks: Record<string, AlarmAck> = { [alarmKey('a', '2026-01-05')]: { by: 'guest', at: T0 } }
    const res = activeAlarms([occ('a', T0), occ('b', T0)], acks, settings, T0)
    expect(ids(res)).toEqual(['b'])
  })

  it('uses the 30 minute default end of an occurrence without end time', () => {
    expect(activeAlarms([occ('e', T0)], {}, settings, T0 + 29 * MIN)).toHaveLength(1)
    expect(activeAlarms([occ('e', T0)], {}, settings, T0 + 30 * MIN)).toHaveLength(0)
  })
})

describe('pruneAcks', () => {
  it('drops acks older than two days', () => {
    const day = 24 * 60 * MIN
    const acks: Record<string, AlarmAck> = {
      old: { by: 'guest', at: T0 - 2 * day - 1 },
      edge: { by: 'admin', at: T0 - 2 * day },
      fresh: { by: 'guest', at: T0 },
    }
    expect(Object.keys(pruneAcks(acks, T0))).toEqual(['edge', 'fresh'])
  })
})
