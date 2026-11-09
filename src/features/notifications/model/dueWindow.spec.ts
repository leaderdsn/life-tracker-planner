import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useScheduleStore } from '@/entities/schedule'

import { useReminderScheduler } from './useReminderScheduler'

describe('due window with a throttled tick', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2024, 2, 4, 14, 40))
    setActivePinia(createPinia())
    const store = useScheduleStore()
    store.events = []
    store.addEvent({ participantIds: ['ruslan'], day: 'mon', start: '15:00', title: 'Вокал', category: 'activity' })
    store.addEvent({ participantIds: ['ratmir'], day: 'mon', start: '15:00', title: 'Плавание', category: 'activity' })
    store.updateSettings({ notificationsEnabled: true, quietHours: null, defaultRemindBefore: 10 })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires once for every participant after a one-minute tick gap', () => {
    const onToast = vi.fn()
    const scheduler = useReminderScheduler({ onToast })
    vi.setSystemTime(new Date(2024, 2, 4, 14, 51))
    scheduler.tick()
    expect(onToast).toHaveBeenCalledTimes(2)
    scheduler.tick()
    expect(onToast).toHaveBeenCalledTimes(2)
    scheduler.stop()
  })
})
