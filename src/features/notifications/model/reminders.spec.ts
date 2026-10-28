import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS } from '@/entities/schedule'
import type { Occurrence, ScheduleEvent, Settings } from '@/entities/schedule'

import type { ReminderKind } from './reminders'
import { dueReminders, isQuietHours, reminderKey, reminderText } from './reminders'

const MIN = 60_000
const start = new Date(2024, 2, 4, 15, 0).getTime()

const occ = (patch: Partial<ScheduleEvent> = {}, startAt = start): Occurrence => ({
  event: {
    id: 'e1',
    participantIds: ['a'],
    day: 'mon',
    start: '15:00',
    title: 'Вокал',
    category: 'activity',
    ...patch,
  },
  date: '2024-03-04',
  startAt,
  endAt: startAt + 30 * MIN,
})

const on: Settings = { ...DEFAULT_SETTINGS, notificationsEnabled: true, quietHours: null }

const kinds = (list: ReturnType<typeof dueReminders>) => list.map((r) => r.kind)

describe('dueReminders', () => {
  it.each<[string, number, string[]]>([
    ['too early', start - 11 * MIN, []],
    ['exactly at the before time', start - 10 * MIN, ['before']],
    ['within the window after the before time', start - 8 * MIN, ['before']],
    ['stale before time', start - 7 * MIN, []],
    ['at start', start, ['start']],
    ['start within the window', start + MIN, ['start']],
    ['stale start (after sleep)', start + 3 * MIN, []],
  ])('%s', (_name, now, expected) => {
    expect(kinds(dueReminders([occ()], on, now, new Set()))).toEqual(expected)
  })

  it('fires once per key', () => {
    const now = start - 10 * MIN
    const first = dueReminders([occ()], on, now, new Set())
    expect(first).toHaveLength(1)
    const fired = new Set(first.map((r) => r.key))
    expect(dueReminders([occ()], on, now + 30_000, fired)).toEqual([])
    expect(first[0]?.key).toBe(reminderKey(occ(), 'before'))
  })

  it('uses the event remindBefore over the default and skips 0', () => {
    const now = start - 5 * MIN
    expect(kinds(dueReminders([occ({ remindBefore: 5 })], on, now, new Set()))).toEqual(['before'])
    expect(dueReminders([occ({ remindBefore: 0 })], on, now, new Set())).toEqual([])
  })

  it('is silent when notifications are off', () => {
    expect(dueReminders([occ()], { ...on, notificationsEnabled: false }, start, new Set())).toEqual([])
  })

  it('is silent during quiet hours', () => {
    const quiet = { ...on, quietHours: { from: '14:00', to: '16:00' } }
    expect(dueReminders([occ()], quiet, start, new Set())).toEqual([])
  })
})

describe('isQuietHours', () => {
  const at = (h: number, m = 0) => new Date(2024, 2, 4, h, m).getTime()
  it.each<[string, { from: string; to: string } | null, number, boolean]>([
    ['off', null, at(23), false],
    ['inside wrapping range, evening', { from: '22:00', to: '07:00' }, at(23), true],
    ['inside wrapping range, morning', { from: '22:00', to: '07:00' }, at(6, 59), true],
    ['end is exclusive', { from: '22:00', to: '07:00' }, at(7), false],
    ['start is inclusive', { from: '22:00', to: '07:00' }, at(22), true],
    ['outside wrapping range', { from: '22:00', to: '07:00' }, at(12), false],
    ['same-day range', { from: '13:00', to: '14:00' }, at(13, 30), true],
    ['empty range', { from: '08:00', to: '08:00' }, at(8), false],
  ])('%s', (_name, quiet, now, expected) => {
    expect(isQuietHours(quiet, now)).toBe(expected)
  })
})

describe('reminderText', () => {
  const nameOf = (id: string) => ({ a: 'Руслан', b: 'Ратмир' })[id] ?? id
  it.each<[ReminderKind, Partial<ScheduleEvent>, string]>([
    ['before', { place: 'ДДТ' }, 'Через 10 мин: Вокал (Руслан), ДДТ'],
    ['start', { place: 'ДДТ' }, 'Началось: Вокал (Руслан), ДДТ'],
    ['start', { participantIds: ['a', 'b'] }, 'Началось: Вокал (Руслан, Ратмир)'],
  ])('%s %j', (kind, patch, expected) => {
    const o = occ(patch)
    expect(reminderText({ key: 'k', kind, occ: o, minutesBefore: 10 }, nameOf)).toBe(expected)
  })
})
