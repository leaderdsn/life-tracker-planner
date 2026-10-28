import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSeedSnapshot, DEVICE_STORAGE_KEY, GUEST_CACHE_KEY, STORAGE_KEY } from '../config'

import { toShared } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useScheduleStore } from './scheduleStore'
import { useSyncStore } from './syncStore'

import type { SharedSchedule } from './types'

const shared = (): SharedSchedule => {
  const snap = toShared(createSeedSnapshot())
  return { ...snap, events: snap.events.slice(0, 2) }
}

function guestStore() {
  localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify({ role: 'guest', householdId: null }))
  setActivePinia(createPinia())
  return useScheduleStore()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('guest schedule store', () => {
  it('starts empty without a cache and refuses local edits', async () => {
    const store = guestStore()
    expect(store.participants).toEqual([])
    expect(() => store.addParticipant({ name: 'Аня', color: '#fff' })).toThrow()
    expect(() => store.toggleCompletion('e1', '2026-01-05')).toThrow()
    await vi.advanceTimersByTimeAsync(5000)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('boots from the cached remote copy', () => {
    localStorage.setItem(GUEST_CACHE_KEY, JSON.stringify(shared()))
    expect(guestStore().events).toHaveLength(2)
  })

  it('hydrates from the remote schedule, caches it and never saves it as local data', async () => {
    const store = guestStore()
    useSyncStore().remoteSchedule = shared()
    await vi.advanceTimersByTimeAsync(5000)
    expect(store.events).toHaveLength(2)
    expect(JSON.parse(localStorage.getItem(GUEST_CACHE_KEY) ?? '{}').events).toHaveLength(2)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('without a cache falls back to the admin local snapshot, read-only', async () => {
    const snap = createSeedSnapshot()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snap, events: snap.events.slice(0, 3) }))
    const store = guestStore()
    expect(store.events).toHaveLength(3)
    expect(() => store.removeEvent('x')).toThrow()
    await vi.advanceTimersByTimeAsync(5000)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').events).toHaveLength(3)
  })

  it('follows admin saves from another tab via storage events', () => {
    const store = guestStore()
    const snap = createSeedSnapshot()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snap, events: snap.events.slice(0, 4) }))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    expect(store.events).toHaveLength(4)
  })

  it('switches to local data when the device becomes admin', async () => {
    const store = guestStore()
    useDeviceStore().setRole('admin')
    await vi.advanceTimersByTimeAsync(10)
    expect(store.participants).toHaveLength(4)
    expect(() => store.addParticipant({ name: 'Аня', color: '#fff' })).not.toThrow()
  })
})
