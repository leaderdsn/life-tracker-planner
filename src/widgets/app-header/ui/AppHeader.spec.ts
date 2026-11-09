import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEVICE_STORAGE_KEY, useDeviceStore } from '@/entities/schedule'

import AppHeader from './AppHeader.vue'

vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }) }))
vi.mock('@/features/sync-settings', () => ({ SyncBadge: { template: '<i />' } }))

const OFF = 'Выключить звук на этом устройстве'
const ON = 'Включить звук на этом устройстве'

function mountHeader(role: string) {
  localStorage.setItem(
    DEVICE_STORAGE_KEY,
    JSON.stringify({ role, householdId: null, participantId: role === 'participant' ? 'misha' : null }),
  )
  setActivePinia(createPinia())
  return mount(AppHeader, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
}

describe('AppHeader mute toggle', () => {
  beforeEach(() => localStorage.clear())

  it('toggles and persists the device mute for the admin', async () => {
    const wrapper = mountHeader('admin')
    const button = wrapper.get(`[aria-label="${OFF}"]`)
    expect(button.attributes('aria-pressed')).toBe('false')
    await button.trigger('click')
    expect(wrapper.get(`[aria-label="${ON}"]`).attributes('aria-pressed')).toBe('true')
    expect(useDeviceStore().muted).toBe(true)
    expect(JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) ?? '{}').muted).toBe(true)
  })

  it('is hidden on a participant device', () => {
    const wrapper = mountHeader('participant')
    expect(wrapper.find(`[aria-label="${OFF}"]`).exists()).toBe(false)
  })
})
