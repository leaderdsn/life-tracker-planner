import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import EventForm from './EventForm.vue'

import type { ScheduleEvent } from '../model/types'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined }))
  localStorage.clear()
  setActivePinia(createPinia())
})

const base: ScheduleEvent = {
  id: 'e1',
  participantIds: ['r'],
  day: 'mon',
  start: '09:00',
  title: 'Вокал',
  category: 'activity',
}

function mountForm(initial?: ScheduleEvent) {
  return mount(EventForm, { props: { participantIds: ['r'], submitLabel: 'Сохранить', initial } })
}

const toggle = (wrapper: ReturnType<typeof mountForm>) => wrapper.get('input[id$="-show-all"]')
const submitted = (wrapper: ReturnType<typeof mountForm>) =>
  (wrapper.emitted('submit')![0] as [Record<string, unknown>[]])[0][0]

describe('EventForm «Показывать во вкладке «Все»»', () => {
  it('включено по умолчанию и подписано', () => {
    const wrapper = mountForm()
    expect(wrapper.text()).toContain('Показывать во вкладке «Все»')
    expect((toggle(wrapper).element as HTMLInputElement).checked).toBe(true)
  })

  it('по умолчанию не пишет showInAll: false', async () => {
    const wrapper = mountForm(base)
    await wrapper.get('form').trigger('submit')
    expect(submitted(wrapper)).not.toHaveProperty('showInAll', false)
  })

  it('выключенный переключатель сохраняет showInAll: false', async () => {
    const wrapper = mountForm(base)
    await toggle(wrapper).setValue(false)
    await wrapper.get('form').trigger('submit')
    expect(submitted(wrapper)).toHaveProperty('showInAll', false)
  })

  it('у скрытого события при редактировании выключен', () => {
    expect((toggle(mountForm({ ...base, showInAll: false })).element as HTMLInputElement).checked).toBe(false)
  })
})
