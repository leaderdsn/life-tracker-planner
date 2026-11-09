import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import { useScheduleStore } from '@/entities/schedule'

import ScheduleWeek from './ScheduleWeek.vue'

const ANCHOR = '2026-03-02'

function mountWeek(participantId: string) {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useScheduleStore()
  store.participants.splice(0, store.participants.length, { id: 'r', name: 'Мирон', color: '#bde0fe', order: 0 })
  store.events.splice(
    0,
    store.events.length,
    { id: 'a', participantIds: ['r'], day: 'mon', start: '09:00', title: 'Вокал', category: 'activity' },
    { id: 'b', participantIds: ['r'], day: 'mon', start: '11:00', title: 'Секретное', category: 'activity', showInAll: false },
  )
  return mount(ScheduleWeek, { props: { participantId, anchor: ANCHOR }, global: { plugins: [pinia] } })
}

describe('ScheduleWeek и вкладка «Все»', () => {
  it('скрытые события и их строки времени пропадают', () => {
    const wrapper = mountWeek('all')
    expect(wrapper.text()).toContain('Вокал')
    expect(wrapper.text()).not.toContain('Секретное')
    expect(wrapper.findAll('tbody tr')).toHaveLength(1)
  })

  it('в личной вкладке скрытое событие остаётся со значком', () => {
    const wrapper = mountWeek('r')
    expect(wrapper.text()).toContain('Секретное')
    expect(wrapper.findAll('.event-chip__badge--hidden')).toHaveLength(1)
  })
})
