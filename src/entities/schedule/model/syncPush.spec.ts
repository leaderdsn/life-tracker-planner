import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { PUSH_DELAY_MS, SCHEMA_VERSION } from '../config'

import { useDeviceStore } from './deviceStore'
import { useScheduleStore } from './scheduleStore'
import { useSyncStore } from './syncStore'

import type { SharedSchedule, SyncStatus } from './types'

const fake = vi.hoisted(() => ({
  pushSchedule: undefined as unknown as (s: unknown) => void,
  schedule: undefined as undefined | ((s: unknown) => void),
  status: undefined as undefined | ((s: SyncStatus) => void),
}))

vi.mock('../lib', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  createTransport: () => ({
    connect: () => Promise.resolve(),
    disconnect: () => undefined,
    getStatus: () => 'online',
    onStatus: (cb: (s: SyncStatus) => void) => ((fake.status = cb), () => undefined),
    onSchedule: (cb: (s: unknown) => void) => ((fake.schedule = cb), () => undefined),
    pushSchedule: (s: unknown) => (fake.pushSchedule(s), Promise.resolve()),
    pushProfile: () => Promise.resolve(),
    setCompletion: () => Promise.resolve(),
    setRinging: () => Promise.resolve(),
    ack: () => Promise.resolve(),
    onRinging: () => () => undefined,
    onAcks: () => () => undefined,
    onProfiles: () => () => undefined,
    onCompletions: () => () => undefined,
  }),
}))

const remote = (): SharedSchedule => ({
  version: SCHEMA_VERSION,
  participants: [{ id: 'ratmir', name: 'Ратмир', color: '#CFE2FF', order: 0, pinHash: 'hash' }],
  events: [],
  settings: { adminPinHash: 'admin-hash' } as SharedSchedule['settings'],
})

const push = vi.fn<(s: unknown) => void>()
const settle = (ms = PUSH_DELAY_MS + 500) => vi.advanceTimersByTimeAsync(ms)

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  fake.pushSchedule = push
  setActivePinia(createPinia())
  useDeviceStore().setHousehold('household-push-test-0123')
})

afterEach(() => {
  useSyncStore().stop()
  vi.useRealTimers()
})

describe('admin push guard', () => {
  it('does not push before the remote arrived, then adopts it and pushes later changes', async () => {
    const store = useScheduleStore()
    const sync = useSyncStore()
    await settle()
    fake.status?.('online')
    store.updateSettings({ adminPinHash: 'local' })
    await settle()
    expect(push).not.toHaveBeenCalled()

    fake.schedule?.(remote())
    await settle()
    expect(sync.remoteReceived).toBe(true)
    expect(store.participants.map((p) => [p.id, p.pinHash])).toEqual([['ratmir', 'hash']])
    expect(store.settings.adminPinHash).toBe('admin-hash')

    push.mockClear()
    store.updateSettings({ adminPinHash: 'changed' })
    await settle()
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('an empty remote (null) allows the first push of local data', async () => {
    useScheduleStore()
    await settle()
    expect(push).not.toHaveBeenCalled()
    fake.schedule?.(null)
    await settle()
    expect(push).toHaveBeenCalled()
  })

  it('forgets the received flag on reconnect', () => {
    useScheduleStore()
    const sync = useSyncStore()
    fake.schedule?.(null)
    expect(sync.remoteReceived).toBe(true)
    sync.stop()
    expect(sync.remoteReceived).toBe(false)
    sync.start()
    expect(sync.remoteReceived).toBe(false)
  })
})
