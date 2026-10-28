import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LocalTransport } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useSyncStore } from './syncStore'

import type { AlarmAck } from './types'

const HOUSEHOLD = 'household-sync-test-0123'
const KEY = 'e1|2026-01-05'
const info = { title: 'Вокал', participantNames: ['Аня'], startedAt: 1 }
let other: LocalTransport

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  useDeviceStore().setHousehold(HOUSEHOLD)
  other = new LocalTransport()
  await other.connect(HOUSEHOLD)
})

afterEach(() => {
  other.disconnect()
  useSyncStore().stop()
})

describe('sync store', () => {
  it('silence() acknowledges as admin and removes the alarm from ringing', async () => {
    const sync = useSyncStore()
    sync.start()
    await other.setRinging(KEY, info)
    await vi.waitFor(() => expect(Object.keys(sync.ringing)).toEqual([KEY]))

    const remote = vi.fn<(acks: Record<string, AlarmAck>) => void>()
    other.onAcks(remote)
    await sync.silence(KEY)

    expect(sync.ringing).toEqual({})
    expect(sync.acks[KEY]?.by).toBe('admin')
    await vi.waitFor(() => expect(remote.mock.lastCall?.[0][KEY]?.by).toBe('admin'))
  })

  it('silenceAll() silences every ringing alarm', async () => {
    const sync = useSyncStore()
    sync.start()
    await other.setRinging('a|2026-01-05', info)
    await other.setRinging('b|2026-01-05', info)
    await vi.waitFor(() => expect(Object.keys(sync.ringing)).toHaveLength(2))
    sync.silenceAll()
    expect(sync.ringing).toEqual({})
  })

  it('enableSync() creates a household once and builds the guest link', () => {
    localStorage.clear()
    setActivePinia(createPinia())
    const sync = useSyncStore()
    const id = sync.enableSync()
    expect(id).toHaveLength(24)
    expect(sync.enableSync()).toBe(id)
    expect(sync.guestLink).toContain(`#/guest?h=${id}`)
  })
})
