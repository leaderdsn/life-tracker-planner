import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEVICE_STORAGE_KEY } from '../config'

import { useDeviceStore } from './deviceStore'

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
    expect(JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) ?? '')).toEqual({ role: 'guest', householdId: 'abc' })
    setActivePinia(createPinia())
    expect(useDeviceStore().role).toBe('guest')
  })

  it.each([['not json'], ['{"role":"root","householdId":5}']])('recovers from bad storage %s', (raw) => {
    localStorage.setItem(DEVICE_STORAGE_KEY, raw)
    const d = useDeviceStore()
    expect([d.role, d.householdId]).toEqual(['admin', null])
  })
})
