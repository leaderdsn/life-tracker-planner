import { describe, expect, it } from 'vitest'

import { planImport } from './plan'

import type { Participant, ScheduleEvent } from '../../model/types'
import type { ParsedImport } from './rows'

const current = {
  participants: [{ id: 'a', name: 'Аня', color: '#FCE8B2', order: 0 }] as Participant[],
  events: [
    { id: 'e1', participantIds: ['a'], day: 'mon', start: '08:00', title: 'Вокал', category: 'activity' },
    { id: 'e2', participantIds: ['a'], day: 'tue', start: '08:00', title: 'Плавание', category: 'activity' },
  ] as ScheduleEvent[],
  completions: [
    { eventId: 'e1', date: '2026-03-02', status: 'done' as const },
    { eventId: 'e2', date: '2026-03-03', status: 'done' as const },
  ],
}

const parsed: ParsedImport = {
  events: [
    { participantIds: ['a'], day: 'mon', start: '08:00', title: 'вокал', category: 'study' },
    { participantIds: ['a', 'b'], day: 'mon', start: '09:00', title: 'Новое', category: 'activity' },
    { participantIds: ['b', 'a'], day: 'mon', start: '09:00', title: 'Новое', category: 'activity' },
  ],
  participants: [{ id: 'b', name: 'Боря', color: '#CFE2FF', order: 1 }],
  errors: [{ row: 5, message: 'Не указан участник' }],
  rows: 4,
}

describe('planImport', () => {
  it('merge keeps current, skips exact duplicates (also inside the file)', () => {
    const { result, summary } = planImport(current, parsed, 'merge')
    expect(result.events).toHaveLength(3)
    expect(result.events.slice(0, 2)).toEqual(current.events)
    expect(result.events[2]).toMatchObject({ title: 'Новое' })
    expect(result.events[2]?.id).toMatch(/^e/)
    expect(result.completions).toEqual(current.completions)
    expect(result.participants.map((p) => p.id)).toEqual(['a', 'b'])
    expect(summary).toMatchObject({ mode: 'merge', added: 1, skipped: 2, removed: 0, newParticipants: 1 })
    expect(summary.errors).toHaveLength(1)
  })

  it('replace swaps events, keeps participants, drops stale completions', () => {
    const { result, summary } = planImport(current, parsed, 'replace')
    expect(result.events).toHaveLength(2)
    expect(result.events.some((e) => e.id === 'e1')).toBe(false)
    expect(result.completions).toEqual([])
    expect(result.participants.map((p) => p.id)).toEqual(['a', 'b'])
    expect(summary).toMatchObject({ mode: 'replace', added: 2, skipped: 1, removed: 2 })
  })

  it('does not mutate the current data', () => {
    const before = JSON.stringify(current)
    planImport(current, parsed, 'replace')
    expect(JSON.stringify(current)).toBe(before)
  })
})
