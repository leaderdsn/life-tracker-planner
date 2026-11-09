import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive } from 'vue'

import { DEVICE_STORAGE_KEY, useScheduleStore } from '@/entities/schedule'

import { useGuestRingingNotifier } from './useGuestRingingNotifier'

type Info = { title: string; participantNames: string[]; startedAt: number }

const state = reactive<{ ringing: Record<string, Info> }>({ ringing: {} })

vi.mock('@/entities/schedule', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useSyncStore: () => state,
}))

const notification = vi.fn()
const stops: (() => void)[] = []
const vocal: Info = { title: 'Вокал', participantNames: ['Мирон'], startedAt: 1 }
const swim: Info = { title: 'Плавание', participantNames: ['Тимур'], startedAt: 2 }

function setup(extra: object = {}) {
  localStorage.setItem(
    DEVICE_STORAGE_KEY,
    JSON.stringify({ role: 'admin', householdId: null, participantId: null, ...extra }),
  )
  setActivePinia(createPinia())
  const store = useScheduleStore()
  store.settings = { ...store.settings, notificationsEnabled: true }
  stops.push(useGuestRingingNotifier({ onToast: vi.fn() }).stop)
}

describe('guest ringing notifications', () => {
  beforeEach(() => {
    localStorage.clear()
    state.ringing = {}
    notification.mockClear()
    vi.stubGlobal('Notification', Object.assign(notification, { permission: 'granted' }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    stops.splice(0).forEach((stop) => stop())
  })

  it('notifies once per ringing key', async () => {
    setup()
    state.ringing = { a: vocal }
    await nextTick()
    state.ringing = { a: vocal, b: swim }
    await nextTick()
    state.ringing = { b: swim }
    await nextTick()
    state.ringing = { a: vocal, b: swim }
    await nextTick()
    expect(notification).toHaveBeenCalledTimes(2)
    expect(notification).toHaveBeenCalledWith(
      'Расписание',
      expect.objectContaining({ body: 'Звенит у гостя: Вокал (Мирон)', tag: 'ringing|a' }),
    )
  })

  it('is silent when the device is muted', async () => {
    setup({ muted: true })
    state.ringing = { a: vocal }
    await nextTick()
    expect(notification).toHaveBeenCalledWith('Расписание', expect.objectContaining({ silent: true }))
  })

  it('does nothing on a non-admin device', async () => {
    setup({ role: 'guest' })
    state.ringing = { a: vocal }
    await nextTick()
    expect(notification).not.toHaveBeenCalled()
  })
})
