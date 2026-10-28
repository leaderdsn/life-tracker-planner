import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventChip from './EventChip.vue'

import type { EventStatus, Participant, ScheduleEvent } from '../model/types'

const participant: Participant = { id: 'r', name: 'Руслан', color: '#bde0fe', order: 0 }
const event: ScheduleEvent = {
  id: 'e1',
  participantIds: ['r'],
  day: 'mon',
  start: '09:00',
  end: '10:00',
  title: 'Вокал',
  category: 'activity',
}

function mountChip(props: { status?: EventStatus; done?: boolean; conflict?: boolean; event?: ScheduleEvent } = {}) {
  return mount(EventChip, {
    props: { event, participants: [participant], status: 'upcoming', ...props },
  })
}

describe('EventChip', () => {
  it('показывает инициал и название', () => {
    const wrapper = mountChip()
    expect(wrapper.text()).toContain('Р')
    expect(wrapper.text()).toContain('Вокал')
  })

  it.each([
    ['current', 'is-current'],
    ['next', 'is-next'],
    ['past', 'is-past'],
  ] as const)('статус %s даёт класс %s', (status, cls) => {
    expect(mountChip({ status }).classes()).toContain(cls)
  })

  it('отмечает выполненное и конфликтное', () => {
    const classes = mountChip({ done: true, conflict: true }).classes()
    expect(classes).toContain('is-done')
    expect(classes).toContain('has-conflict')
  })

  it('показывает «?» и причину для needsReview', () => {
    const wrapper = mountChip({ event: { ...event, needsReview: 'Время не указано' } })
    expect(wrapper.classes()).toContain('needs-review')
    expect(wrapper.get('.event-chip__badge--review').attributes('title')).toBe('Время не указано')
    expect(wrapper.get('button').attributes('aria-label')).toContain('Время не указано')
  })

  it('не только цветом: статус есть в доступной подписи', () => {
    expect(mountChip({ status: 'current' }).get('button').attributes('aria-label')).toContain('идёт сейчас')
  })
})
