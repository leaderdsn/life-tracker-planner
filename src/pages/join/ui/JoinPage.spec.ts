import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { hashParticipantPin, SCHEMA_VERSION, useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import JoinPage from './JoinPage.vue'

const PIN = '1234'

type Setup = Awaited<ReturnType<typeof setup>>

async function setup() {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useScheduleStore()
  const device = useDeviceStore()
  device.setHousehold('house')
  for (const id of store.participants.map((p) => p.id)) store.removeParticipant(id)
  const a = store.addParticipant({ name: 'Анна', color: '#CFE2FF' })
  const b = store.addParticipant({ name: 'Борис', color: '#CDEFD6' })
  store.updateParticipant(a.id, { pinHash: await hashParticipantPin(PIN, a.id, 'house') })
  const sync = useSyncStore()
  sync.remoteSchedule = { version: SCHEMA_VERSION, participants: store.participants.map((p) => ({ ...p })), events: [], settings: store.settings }
  device.logout()

  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/join', name: ROUTE_NAMES.join, component: stub },
      { path: '/p/:id', name: ROUTE_NAMES.participant, component: stub },
      { path: '/all', name: ROUTE_NAMES.all, component: stub },
    ],
  })
  await router.push('/join')
  const wrapper = mount(JoinPage, { global: { plugins: [pinia, router] } })
  return { wrapper, router, device, a, b }
}

async function press({ wrapper }: Setup, digits: string) {
  for (const digit of digits) await wrapper.get(`[data-key="${digit}"]`).trigger('click')
}

describe('JoinPage', () => {
  it('показывает карточки участников и «Администратор»', async () => {
    const { wrapper } = await setup()
    expect(wrapper.findAll('.join-page__name').map((n) => n.text())).toEqual(['Анна', 'Борис', 'Администратор'])
  })

  it('сначала выбор участника, затем PIN: неверный не пускает, верный входит', async () => {
    const ctx = await setup()
    const { wrapper, router, device, a } = ctx
    await wrapper.findAll('.join-page__person')[0]?.trigger('click')
    expect(wrapper.find('.pin-keypad').exists()).toBe(true)

    await press(ctx, '9999')
    await wrapper.get('[data-key="submit"]').trigger('click')
    await flushPromises()
await vi.waitFor(() => expect(wrapper.get('.pin-keypad__error').text()).toBe('Неверный PIN'))
    expect(device.participantId).toBeNull()

    await press(ctx, PIN)
    await wrapper.get('[data-key="submit"]').trigger('click')
    await flushPromises()
await vi.waitFor(() => expect(device.participantId).toBe(a.id))
    expect(device.role).toBe('participant')
    expect(device.participantId).toBe(a.id)
    expect(router.currentRoute.value.params.id).toBe(a.id)
  })

  it('участник без PIN входит сразу', async () => {
    const { wrapper, device, b } = await setup()
    await wrapper.findAll('.join-page__person')[1]?.trigger('click')
    await flushPromises()
    expect(device.participantId).toBe(b.id)
  })

  it('«Отмена» возвращает к списку', async () => {
    const { wrapper } = await setup()
    await wrapper.findAll('.join-page__person')[0]?.trigger('click')
    await wrapper.get('.pin-keypad__cancel').trigger('click')
    expect(wrapper.findAll('.join-page__person')).toHaveLength(3)
  })
})
