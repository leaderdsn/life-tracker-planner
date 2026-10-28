import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVICE_STORAGE_KEY } from '../config'
import { hashPin } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useScheduleStore } from './scheduleStore'
import { useSyncStore } from './syncStore'

let runs = 0

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('device store', () => {
  it('defaults to admin without a household', () => {
    const d = useDeviceStore()
    expect([d.role, d.householdId]).toEqual(['admin', null])
  })

  it('persists role and household', async () => {
    const d = useDeviceStore()
    d.setRole('guest')
    d.setHousehold('abc')
    await nextTick()
    expect(JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) ?? '')).toEqual({
      role: 'guest',
      householdId: 'abc',
      participantId: null,
    })
    setActivePinia(createPinia())
    expect(useDeviceStore().role).toBe('guest')
  })

  it.each([['not json'], ['{"role":"root","householdId":5}']])('recovers from bad storage %s', (raw) => {
    localStorage.setItem(DEVICE_STORAGE_KEY, raw)
    const d = useDeviceStore()
    expect([d.role, d.householdId]).toEqual(['admin', null])
  })
})

describe('device config migration', () => {
  it.each([
    ['v2 config without participantId', { role: 'guest', householdId: 'abc' }, ['guest', 'abc', null]],
    ['participant config', { role: 'participant', householdId: 'abc', participantId: 'ruslan' }, ['participant', 'abc', 'ruslan']],
    ['stray participantId on admin', { role: 'admin', householdId: null, participantId: 'ruslan' }, ['admin', null, null]],
    ['logged-out participant', { role: 'participant', householdId: 'abc' }, ['participant', 'abc', null]],
  ])('%s', (_name, stored, expected) => {
    localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(stored))
    const d = useDeviceStore()
    expect([d.role, d.householdId, d.participantId]).toEqual(expected)
  })
})

describe('login and logout', () => {
  afterEach(() => useSyncStore().stop())

  async function setup() {
    const d = useDeviceStore()
    d.setHousehold(`household-login-test-${++runs}`)
    const schedule = useScheduleStore()
    await schedule.setParticipantPin('ruslan', '1234')
    // the stale remote copy would win until the debounced push lands
    await vi.waitFor(() => expect(useSyncStore().remoteParticipants.find((p) => p.id === 'ruslan')?.pinHash).toBeTruthy(), { timeout: 3000 })
    return { d, schedule }
  }

  it('logs a participant in with the right PIN and remembers them', async () => {
    const { d } = await setup()
    expect(await d.loginParticipant('ruslan', '0000')).toBe(false)
    expect(d.role).toBe('admin')
    expect(await d.loginParticipant('ruslan', '1234')).toBe(true)
    expect([d.role, d.participantId, d.needsLogin]).toEqual(['participant', 'ruslan', false])
    await nextTick()
    setActivePinia(createPinia())
    const reloaded = useDeviceStore()
    expect([reloaded.role, reloaded.participantId]).toEqual(['participant', 'ruslan'])
  })

  it('lets a participant without a PIN in and refuses unknown participants', async () => {
    const { d } = await setup()
    expect(await d.loginParticipant('ratmir', '')).toBe(true)
    expect(await d.loginParticipant('nobody', '')).toBe(false)
    expect(d.participantId).toBe('ratmir')
  })

  it('logout returns to the login screen state', async () => {
    const { d } = await setup()
    await d.loginParticipant('ratmir', '')
    d.logout()
    expect([d.role, d.participantId, d.needsLogin]).toEqual(['participant', null, true])
  })

  it('admin login honours the admin PIN, and is open while none is set', async () => {
    const { d, schedule } = await setup()
    d.logout()
    await nextTick()
    expect(await d.loginAdmin('whatever')).toBe(true)
    expect(d.role).toBe('admin')
    await nextTick()
    schedule.updateSettings({ adminPinHash: await hashPin('9999') })
    await vi.waitFor(() => expect(useSyncStore().remoteSchedule?.settings.adminPinHash).toBeTruthy(), { timeout: 3000 })
    d.logout()
    await nextTick()
    expect(await d.loginAdmin('1111')).toBe(false)
    expect(d.needsLogin).toBe(true)
    expect(await d.loginAdmin('9999')).toBe(true)
    expect(d.participantId).toBeNull()
  })
})
