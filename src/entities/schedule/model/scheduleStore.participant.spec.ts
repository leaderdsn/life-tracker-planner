import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVICE_STORAGE_KEY } from '../config'
import { LocalTransport } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useScheduleStore } from './scheduleStore'
import { useSyncStore } from './syncStore'

import type { Participant, ScheduleEvent } from './types'

let HOUSEHOLD = 'household-participant-0001'
let runs = 0
const DATE = '2026-01-05'

const people: Participant[] = [
  { id: 'a', name: 'Аня', color: '#fff', order: 0, avatar: 'data:image/webp;base64,AAAA' },
  { id: 'b', name: 'Боря', color: '#fff', order: 1 },
]
const events: ScheduleEvent[] = [
  { id: 'ea', participantIds: ['a'], day: 'mon', start: '10:00', title: 'Алгебра', category: 'study' },
  { id: 'eb', participantIds: ['b'], day: 'mon', start: '11:00', title: 'Бассейн', category: 'activity' },
  { id: 'eab', participantIds: ['a', 'b'], day: 'mon', start: '12:00', title: 'Обед', category: 'routine' },
]

function participantStore(pid: string | null = 'a') {
  localStorage.setItem(
    DEVICE_STORAGE_KEY,
    JSON.stringify({ role: 'participant', householdId: null, participantId: pid }),
  )
  setActivePinia(createPinia())
  const store = useScheduleStore()
  store.participants = structuredClone(people)
  store.events = structuredClone(events)
  return store
}

beforeEach(() => {
  localStorage.clear()
})

describe('participant store restrictions', () => {
  it('limits events, occurrences and progress to the signed-in participant', () => {
    const store = participantStore('a')
    expect(store.ownEvents.map((e) => e.id)).toEqual(['ea', 'eab'])
    const monday = new Date(2026, 0, 5)
    expect(store.ownOccurrences(monday, monday).map((o) => o.event.id)).toEqual(['ea', 'eab'])
    store.toggleCompletion('ea', DATE)
    expect(store.ownProgress(monday, monday)).toEqual({ done: 1, total: 2 })
  })

  it('has no own data when logged out', () => {
    const store = participantStore(null)
    expect(store.ownEvents).toEqual([])
    expect(store.ownProgress(new Date(2026, 0, 5), new Date(2026, 0, 5))).toEqual({ done: 0, total: 0 })
  })

  it('toggles done on own occurrences only', () => {
    const store = participantStore('a')
    store.toggleCompletion('ea', DATE)
    store.toggleCompletion('eab', DATE)
    expect(store.completions.map((c) => c.eventId).sort()).toEqual(['ea', 'eab'])
    expect(() => store.toggleCompletion('eb', DATE)).toThrow()
    expect(() => store.toggleCompletion('ea', DATE, 'b')).toThrow()
    expect(() => store.toggleCompletion('missing', DATE)).toThrow()
    store.toggleCompletion('ea', DATE)
    expect(store.completions.map((c) => c.eventId)).toEqual(['eab'])
  })

  it('refuses every other mutation', () => {
    const store = participantStore('a')
    const before = JSON.stringify([store.participants, store.events, store.settings])
    const attempts = [
      () => store.addParticipant({ name: 'Вера', color: '#fff' }),
      () => store.updateParticipant('a', { name: 'X' }),
      () => store.removeParticipant('a'),
      () => store.addEvent({ participantIds: ['a'], day: 'tue', start: '10:00', title: 'X', category: 'study' }),
      () => store.updateEvent('ea', { title: 'X' }),
      () => store.confirmEvent('ea'),
      () => store.removeEvent('ea'),
      () => store.updateSettings({ sound: false }),
      () => store.importJson(store.exportJson()),
      () => store.resetToSeed(),
      () => store.setParticipantPin('a', '1234'),
    ]
    for (const attempt of attempts) expect(attempt).toThrow()
    expect(JSON.stringify([store.participants, store.events, store.settings])).toBe(before)
  })

  it('updates only the own profile', () => {
    const store = participantStore('a')
    store.updateOwnProfile('a', { alarmSound: 'bell', avatar: undefined })
    expect(store.ownParticipant?.alarmSound).toBe('bell')
    expect(store.ownParticipant?.avatar).toBeUndefined()
    expect(() => store.updateOwnProfile('b', { alarmSound: 'beep' })).toThrow()
  })

  it('does not save participant data as the local schedule', async () => {
    vi.useFakeTimers()
    const store = participantStore('a')
    store.toggleCompletion('ea', DATE)
    await vi.advanceTimersByTimeAsync(5000)
    vi.useRealTimers()
    expect(localStorage.getItem('life-tracker:v1')).toBeNull()
  })
})

describe('admin', () => {
  it('hashes a participant PIN with the household salt and can clear it', async () => {
    setActivePinia(createPinia())
    useDeviceStore().setHousehold(HOUSEHOLD)
    const store = useScheduleStore()
    await store.setParticipantPin('ruslan', '1234')
    expect(store.participantById('ruslan')?.pinHash).toMatch(/^[0-9a-f]{64}$/)
    await store.setParticipantPin('ruslan', null)
    expect(store.participantById('ruslan')?.pinHash).toBeNull()
  })
})

describe('profile and completion sync between devices', () => {
  let other: LocalTransport

  beforeEach(async () => {
    HOUSEHOLD = `household-participant-run-${++runs}`
    other = new LocalTransport()
    await other.connect(HOUSEHOLD)
  })

  afterEach(() => {
    other.disconnect()
    useSyncStore().stop()
  })

  function adminStore() {
    setActivePinia(createPinia())
    useDeviceStore().setHousehold(HOUSEHOLD)
    const store = useScheduleStore()
    return { store, sync: useSyncStore() }
  }

  it('merges remote profiles and keeps them out of schedule pushes', async () => {
    const { store, sync } = adminStore()
    const target = store.participants[0]?.id as string
    await vi.waitFor(() => expect(sync.status).toBe('online'))

    await other.pushProfile(target, { avatar: 'data:image/webp;base64,BBBB', alarmSound: 'bell' })
    await vi.waitFor(() => expect(store.participantById(target)?.alarmSound).toBe('bell'))

    const pushed = vi.fn()
    other.onSchedule(pushed)
    store.updateSettings({ sound: false })
    await vi.waitFor(() => expect(pushed.mock.lastCall?.[0]?.settings.sound).toBe(false), { timeout: 3000 })
    const shared = pushed.mock.lastCall?.[0]
    expect(shared.participants.every((p: Participant) => !p.avatar && !p.alarmSound)).toBe(true)
    expect(store.participantById(target)?.avatar).toBe('data:image/webp;base64,BBBB')
  })

  it('publishes profile changes and marks, and takes remote marks and clears', async () => {
    const { store, sync } = adminStore()
    await vi.waitFor(() => expect(sync.status).toBe('online'))
    const profiles = vi.fn()
    const marks = vi.fn()
    other.onProfiles(profiles)
    other.onCompletions(marks)
    const ev = store.events[0] as ScheduleEvent

    store.updateProfile('ruslan', { alarmSound: 'beep' })
    await vi.waitFor(() => expect(profiles).toHaveBeenLastCalledWith({ ruslan: { alarmSound: 'beep' } }))

    store.toggleCompletion(ev.id, DATE)
    await vi.waitFor(() => expect(marks.mock.lastCall?.[0][`${ev.id}|${DATE}`]?.by).toBe('admin'))

    await other.setCompletion(`${ev.id}|2026-01-12`, { status: 'done', by: 'participant', at: Date.now() + 10 })
    await vi.waitFor(() => expect(store.completionFor(ev.id, '2026-01-12')?.status).toBe('done'))

    await other.setCompletion(`${ev.id}|${DATE}`, null)
    await vi.waitFor(() => expect(store.completionFor(ev.id, DATE)).toBeUndefined())
  })
})
