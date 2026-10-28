import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocalTransport } from './localTransport'

import type { AlarmAck, RingingInfo, SharedSchedule } from '../../model/types'

const schedule: SharedSchedule = {
  version: 2,
  participants: [{ id: 'a', name: 'Аня', color: '#CFE2FF', order: 0 }],
  events: [],
  settings: {
    notificationsEnabled: false,
    defaultRemindBefore: 10,
    sound: true,
    quietHours: null,
    guestAlarmLead: 30,
    guestIdleReturn: 60,
    alarmSound: 'chime',
    alarmVolume: 0.8,
    adminPinHash: null,
    autoComplete: false,
  },
}
const info: RingingInfo = { title: 'Вокал', participantNames: ['Аня'], startedAt: 1 }
const KEY = 'e|2026-01-05'

const open: LocalTransport[] = []
async function make(channel: string) {
  const t = new LocalTransport()
  open.push(t)
  await t.connect(channel)
  return t
}
const pair = async (channel = 'household-local-test-01') => [await make(channel), await make(channel)] as const

afterEach(() => open.splice(0).forEach((t) => t.disconnect()))

describe('LocalTransport', () => {
  it('reports status', async () => {
    const t = new LocalTransport()
    expect(t.getStatus()).toBe('off')
    const seen: string[] = []
    t.onStatus((s) => seen.push(s))
    await t.connect('household-status-test-01')
    expect(t.getStatus()).toBe('online')
    t.disconnect()
    expect(seen[seen.length - 1]).toBe('off')
    expect(seen).toContain('online')
  })

  it('delivers the schedule to the other instance', async () => {
    const [a, b] = await pair()
    const cb = vi.fn()
    b.onSchedule(cb)
    await a.pushSchedule(schedule)
    await vi.waitFor(() => expect(cb).toHaveBeenLastCalledWith(schedule))
  })

  it('delivers ringing and its removal', async () => {
    const [a, b] = await pair()
    const onA = vi.fn()
    a.onRinging(onA)
    await b.setRinging(KEY, info)
    await vi.waitFor(() => expect(onA).toHaveBeenLastCalledWith({ [KEY]: info }))
    await b.setRinging(KEY, null)
    await vi.waitFor(() => expect(onA).toHaveBeenLastCalledWith({}))
  })

  it('delivers acknowledgements', async () => {
    const [a, b] = await pair()
    let acks: Record<string, AlarmAck> = {}
    b.onAcks((x) => (acks = x))
    await a.ack(KEY, 'admin')
    await vi.waitFor(() => expect(acks[KEY]?.by).toBe('admin'))
  })

  it('gives a late joiner the current state', async () => {
    const channel = 'household-late-test-0001'
    const a = await make(channel)
    await a.pushSchedule(schedule)
    await a.setRinging(KEY, info)
    const b = new LocalTransport()
    open.push(b)
    const sched = vi.fn()
    const ring = vi.fn()
    b.onSchedule(sched)
    b.onRinging(ring)
    await b.connect(channel)
    await vi.waitFor(() => expect(sched).toHaveBeenLastCalledWith(schedule))
    await vi.waitFor(() => expect(ring).toHaveBeenLastCalledWith({ [KEY]: info }))
  })

  it('isolates households', async () => {
    const a = await make('household-one-test-0001')
    const b = await make('household-two-test-0001')
    const cb = vi.fn()
    b.onRinging(cb)
    await a.setRinging(KEY, info)
    await new Promise((r) => setTimeout(r, 50))
    expect(cb).not.toHaveBeenCalled()
  })
})
