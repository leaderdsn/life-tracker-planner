import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useScheduleStore } from '@/entities/schedule'

import { FIRED_STORAGE_KEY, loadFired } from './firedStorage'
import { useReminderScheduler } from './useReminderScheduler'

describe('useReminderScheduler', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    // Monday 14:55, before the 15:00 event
    vi.setSystemTime(new Date(2024, 2, 4, 14, 55))
    setActivePinia(createPinia())
    const store = useScheduleStore()
    store.events = []
    store.addEvent({ participantIds: ['ruslan'], day: 'mon', start: '15:00', title: 'Вокал', place: 'ДДТ', category: 'activity' })
    store.updateSettings({ notificationsEnabled: true, quietHours: null })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('toasts each reminder once across ticks', () => {
    const onToast = vi.fn()
    const scheduler = useReminderScheduler({ onToast })
    expect(onToast).toHaveBeenCalledTimes(0)

    vi.setSystemTime(new Date(2024, 2, 4, 14, 40))
    vi.advanceTimersByTime(30_000)
    expect(onToast).toHaveBeenCalledTimes(0)

    vi.setSystemTime(new Date(2024, 2, 4, 14, 50))
    vi.advanceTimersByTime(30_000)
    vi.advanceTimersByTime(30_000)
    expect(onToast).toHaveBeenCalledTimes(1)
    expect(onToast).toHaveBeenLastCalledWith('Через 10 мин: Вокал (Руслан), ДДТ')

    vi.setSystemTime(new Date(2024, 2, 4, 15, 0))
    vi.advanceTimersByTime(30_000)
    vi.advanceTimersByTime(30_000)
    vi.advanceTimersByTime(30_000)
    expect(onToast).toHaveBeenCalledTimes(2)
    expect(onToast).toHaveBeenLastCalledWith('Началось: Вокал (Руслан), ДДТ')
    scheduler.stop()
  })

  it('fires the immediate tick and remembers keys in storage', () => {
    vi.setSystemTime(new Date(2024, 2, 4, 14, 52))
    const onToast = vi.fn()
    useReminderScheduler({ onToast }).stop()
    expect(onToast).toHaveBeenCalledWith('Через 10 мин: Вокал (Руслан), ДДТ')
    expect(Object.keys(loadFired(Date.now()))).toHaveLength(1)

    useReminderScheduler({ onToast }).stop()
    expect(onToast).toHaveBeenCalledTimes(1)
  })

  it('prunes keys older than two days', () => {
    const now = Date.now()
    localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify({ old: now - 3 * 86_400_000, fresh: now - 1000 }))
    expect(Object.keys(loadFired(now))).toEqual(['fresh'])
  })

  it('stops ticking after stop()', () => {
    const onToast = vi.fn()
    useReminderScheduler({ onToast }).stop()
    vi.setSystemTime(new Date(2024, 2, 4, 15, 0))
    vi.advanceTimersByTime(60_000)
    expect(onToast).not.toHaveBeenCalled()
  })
})
