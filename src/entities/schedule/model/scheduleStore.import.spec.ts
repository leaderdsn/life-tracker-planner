import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { planImport, rowsToEvents } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useScheduleStore } from './scheduleStore'

const HEADER = ['Участники', 'День', 'Начало', 'Занятие']

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

function plan(mode: 'replace' | 'merge') {
  const store = useScheduleStore()
  const parsed = rowsToEvents({ events: [HEADER, ['Новичок', 'ПН', '9:00', 'Йога']] }, store.participants)
  return { store, plan: planImport({ participants: store.participants, events: store.events, completions: store.completions }, parsed, mode) }
}

describe('applyImport', () => {
  it('applies the plan and can be undone', () => {
    setActivePinia(createPinia())
    const { store, plan: p } = plan('replace')
    const before = store.events.length
    store.applyImport(p)
    expect(store.events).toHaveLength(1)
    expect(store.participants.some((x) => x.name === 'Новичок')).toBe(true)
    expect(store.undo()).toBe(true)
    expect(store.events).toHaveLength(before)
    expect(store.participants.some((x) => x.name === 'Новичок')).toBe(false)
  })

  it('is admin only', () => {
    setActivePinia(createPinia())
    const { store, plan: p } = plan('merge')
    useDeviceStore().role = 'guest'
    expect(() => store.applyImport(p)).toThrow()
  })
})
