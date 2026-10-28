import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { hashParticipantPin, SCHEMA_VERSION, useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import JoinPage from './JoinPage.vue'

const PIN = '1234'

type Setup = Awaited<ReturnType<typeof setup>>

async function setup(options: { remote?: boolean; adminPin?: boolean } = {}) {
  const { remote = true, adminPin = true } = options
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
  if (remote) {
    sync.remoteSchedule = {
      version: SCHEMA_VERSION,
      participants: store.participants.map((p) => ({ ...p })),
      events: [],
      settings: { ...store.settings, adminPinHash: adminPin ? 'admin-hash' : null },
    }
    sync.remoteReceived = true
  }
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
  return { wrapper, router, device, sync, a, b }
}

async function press({ wrapper }: Setup, digits: string) {
  for (const digit of digits) await wrapper.get(`[data-key="${digit}"]`).trigger('click')
}

afterEach(() => vi.useRealTimers())

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

  it('без PIN администратора карточка «Администратор» недоступна и объясняет причину', async () => {
    const { wrapper } = await setup({ adminPin: false })
    expect(wrapper.get('.join-page__person--admin').attributes('disabled')).toBeDefined()
    expect(wrapper.get('.join-page__warning').text()).toContain('PIN администратора не задан')
  })

  it('с PIN администратора карточка доступна и ведёт к вводу PIN', async () => {
    const { wrapper } = await setup()
    await wrapper.get('.join-page__person--admin').trigger('click')
    expect(wrapper.find('.pin-keypad').exists()).toBe(true)
  })

  it('пока удалённый список не получен, локальных участников нет, показано ожидание', async () => {
    const { wrapper } = await setup({ remote: false })
    expect(wrapper.find('.join-page__list').exists()).toBe(false)
    expect(wrapper.get('.join-page__status').text()).toBe('Загружаю список участников…')
  })

  it('через 10 секунд показывает «Нет связи», «Повторить» перезапускает синхронизацию', async () => {
    vi.useFakeTimers()
    const { wrapper, sync } = await setup({ remote: false })
    const stop = vi.spyOn(sync, 'stop').mockImplementation(() => undefined)
    const start = vi.spyOn(sync, 'start').mockImplementation(() => undefined)
    await vi.advanceTimersByTimeAsync(9_000)
    expect(wrapper.text()).not.toContain('Нет связи')
    await vi.advanceTimersByTimeAsync(1_500)
    expect(wrapper.text()).toContain('Нет связи')

    const order: string[] = []
    stop.mockImplementation(() => void order.push('stop'))
    start.mockImplementation(() => void order.push('start'))
    await wrapper.get('button.p-button, button:not(.join-page__person)').trigger('click')
    expect(order).toEqual(['stop', 'start'])
    expect(wrapper.text()).not.toContain('Нет связи')
  })
})
