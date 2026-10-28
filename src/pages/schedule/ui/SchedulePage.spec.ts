import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { useDeviceStore, useScheduleStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import SchedulePage from './SchedulePage.vue'

const stubs = {
  AppHeader: true,
  ProgressPanel: true,
  RingingPanel: true,
  ScheduleLegend: true,
  LegendButton: true,
  ScheduleDay: true,
  ScheduleMonth: true,
  ViewToolbar: { template: '<div><slot /></div>' },
  ScheduleWeek: { emits: ['open-event'], template: '<button class="open" @click="$emit(\'open-event\', \'x\')" />' },
  EditEventDialog: { template: '<div class="edit-event-dialog" />' },
  AddParticipantDialog: { template: '<div class="add-participant-dialog" />' },
  EditParticipantDialog: { template: '<div class="edit-participant-dialog" />' },
  SettingsDialog: { template: '<div class="admin-settings" />' },
  MySettingsDialog: { template: '<div class="my-settings" />' },
}

async function mountAs(role: 'admin' | 'participant') {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useScheduleStore()
  const device = useDeviceStore()
  const person = store.sortedParticipants[0]
  if (role === 'participant' && person) {
    device.setRole('participant')
    device.$patch({ participantId: person.id })
  }
  const stub = { template: '<div />' }
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/all', name: ROUTE_NAMES.all, component: stub },
      { path: '/p/:id', name: ROUTE_NAMES.participant, component: stub },
    ],
  })
  await router.push(person && role === 'participant' ? `/p/${person.id}` : '/all')
  return mount(SchedulePage, { global: { plugins: [pinia, router], stubs } })
}

describe('SchedulePage by role', () => {
  it('у участника нет ни кнопок правки, ни окон редактирования', async () => {
    const wrapper = await mountAs('participant')
    await wrapper.get('.open').trigger('click')
    expect(wrapper.find('.edit-event-dialog').exists()).toBe(false)
    expect(wrapper.find('.add-participant-dialog').exists()).toBe(false)
    expect(wrapper.find('.edit-participant-dialog').exists()).toBe(false)
    expect(wrapper.find('.admin-settings').exists()).toBe(false)
    expect(wrapper.find('.my-settings').exists()).toBe(true)
    expect(wrapper.find('.schedule-page__personal').exists()).toBe(false)
  })

  it('у администратора окна редактирования доступны', async () => {
    const wrapper = await mountAs('admin')
    expect(wrapper.find('.edit-event-dialog').exists()).toBe(true)
    expect(wrapper.find('.admin-settings').exists()).toBe(true)
    expect(wrapper.find('.my-settings').exists()).toBe(false)
  })
})
