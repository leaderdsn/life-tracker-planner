import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVICE_STORAGE_KEY, useScheduleStore } from '@/entities/schedule'
import { playOnce } from '@/shared/lib'

import { useReminderScheduler } from './useReminderScheduler'

vi.mock('@/shared/lib/audio/audio', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  playOnce: vi.fn(),
}))

const notification = vi.fn()
const beepStart = vi.fn()

class FakeAudioContext {
  currentTime = 0
  destination = {}
  createOscillator = () => ({ frequency: {}, connect: (n: unknown) => n, start: beepStart, stop: vi.fn() })
  createGain = () => ({
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: (n: unknown) => n,
  })
}

function run(muted: boolean) {
  localStorage.setItem(
    DEVICE_STORAGE_KEY,
    JSON.stringify({ role: 'admin', householdId: null, participantId: null, muted }),
  )
  setActivePinia(createPinia())
  const store = useScheduleStore()
  store.events = []
  store.addEvent({ participantIds: ['misha'], day: 'mon', start: '15:00', title: 'Вокал', category: 'activity' })
  store.updateSettings({ notificationsEnabled: true, quietHours: null, sound: true })
  useReminderScheduler({ onToast: vi.fn() }).stop()
}

describe('muted admin device', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 4, 14, 52))
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }))
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    notification.mockClear()
    beepStart.mockClear()
  })

  it('plays no sound and shows a silent notification', () => {
    run(true)
    expect(beepStart).not.toHaveBeenCalled()
    expect(playOnce).not.toHaveBeenCalled()
    expect(notification).toHaveBeenCalledWith('Расписание', expect.objectContaining({ silent: true }))
  })

  it('beeps when not muted', () => {
    run(false)
    expect(beepStart).toHaveBeenCalledTimes(1)
    expect(notification).toHaveBeenCalledWith('Расписание', expect.objectContaining({ silent: false }))
  })
})
