import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ConfirmationService from 'primevue/confirmationservice'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useDeviceStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import SettingsDialog from './SettingsDialog.vue'

const requireConfirm = vi.fn()
vi.mock('primevue/useconfirm', () => ({ useConfirm: () => ({ require: requireConfirm }) }))

async function setup(household: string | null) {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const device = useDeviceStore()
  device.setHousehold(household)
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/all', name: ROUTE_NAMES.all, component: stub },
      { path: '/join', name: ROUTE_NAMES.join, component: stub },
    ],
  })
  await router.push('/all')
  const wrapper = mount(SettingsDialog, {
    props: { visible: true },
    global: {
      plugins: [pinia, router, ConfirmationService],
      stubs: {
        AppDialog: { template: '<div><slot /></div>' },
        NotificationSettings: true,
        SyncSettings: true,
        ImportExportPanel: true,
      },
    },
  })
  return { wrapper, router, device }
}

const findSwitch = (wrapper: Awaited<ReturnType<typeof setup>>['wrapper']) =>
  wrapper.findAll('button').find((b) => b.text() === 'Сменить пользователя')

describe('SettingsDialog switch user', () => {
  it('скрыта без дома', async () => {
    const { wrapper } = await setup(null)
    expect(findSwitch(wrapper)).toBeUndefined()
  })

  it('спрашивает подтверждение, затем выходит на экран входа', async () => {
    const { wrapper, router, device } = await setup('house')
    await findSwitch(wrapper)?.trigger('click')
    const options = requireConfirm.mock.calls[0]?.[0] as { message: string; accept: () => void }
    expect(options.message).toContain('Вернуться в режим администратора можно по PIN')
    expect(device.role).toBe('admin')

    options.accept()
    await vi.waitFor(() => expect(router.currentRoute.value.name).toBe(ROUTE_NAMES.join))
    expect(device.needsLogin).toBe(true)
  })
})
