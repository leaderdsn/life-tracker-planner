import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVICE_STORAGE_KEY, useScheduleStore } from '@/entities/schedule'
import { playOnce } from '@/shared/lib'

import { useReminderScheduler } from './useReminderScheduler'

vi.mock('@/shared/lib/audio/audio', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  playOnce: vi.fn(),
}))

describe('reminders on a participant device', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 4, 14, 55))
    localStorage.setItem(
      DEVICE_STORAGE_KEY,
      JSON.stringify({ role: 'participant', householdId: null, participantId: 'ratmir' }),
    )
    setActivePinia(createPinia())
    const store = useScheduleStore()
    store.participants = [
      { id: 'ruslan', name: 'Руслан', color: '#fff', order: 0 },
      { id: 'ratmir', name: 'Ратмир', color: '#fff', order: 1, alarmSound: 'bell' },
    ]
    store.settings = { ...store.settings, notificationsEnabled: true, quietHours: null, alarmSound: 'chime' }
    store.events = [
      { id: 'e1', participantIds: ['ruslan'], day: 'mon', start: '15:00', title: 'Вокал', category: 'activity' },
      { id: 'e2', participantIds: ['ratmir'], day: 'mon', start: '15:00', title: 'Плавание', category: 'activity' },
    ]
    vi.mocked(playOnce).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reminds only about own events and plays the own sound', () => {
    const onToast = vi.fn()
    vi.setSystemTime(new Date(2024, 2, 4, 14, 50))
    useReminderScheduler({ onToast })
    expect(onToast).toHaveBeenCalledTimes(1)
    expect(onToast.mock.calls[0]?.[0]).toContain('Плавание')
    expect(playOnce).toHaveBeenCalledWith('bell', expect.any(Number))
  })
})
