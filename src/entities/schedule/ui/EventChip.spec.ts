import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import EventChip from './EventChip.vue'

import type { EffectiveCompletion } from '../lib'
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

function mountChip(
  props: { status?: EventStatus; done?: boolean; completion?: EffectiveCompletion; conflict?: boolean; event?: ScheduleEvent; canToggle?: boolean } = {},
) {
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

  it('автоотметка: галочка, маркер «авто», подсказка и подпись', () => {
    const wrapper = mountChip({ completion: 'auto', canToggle: true })
    const check = wrapper.get('.event-chip__check')
    const hint = 'Отмечено автоматически — нажмите, чтобы отметить как невыполненное'
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['is-done', 'is-auto']))
    expect(wrapper.classes()).not.toContain('is-skipped')
    expect(check.find('.pi-check-circle').exists()).toBe(true)
    expect(check.text()).toContain('авто')
    expect(check.attributes('title')).toBe(hint)
    expect(check.attributes('aria-label')).toBe(hint)
    expect(check.attributes('aria-pressed')).toBe('true')
    expect(wrapper.get('.event-chip__main').attributes('aria-label')).toContain('выполнено автоматически')
  })

  it('пропущенное: крестик, приглушено, не считается выполненным', () => {
    const wrapper = mountChip({ completion: 'skipped', canToggle: true })
    const check = wrapper.get('.event-chip__check')
    expect(wrapper.classes()).toContain('is-skipped')
    expect(wrapper.classes()).not.toContain('is-done')
    expect(check.find('.pi-times-circle').exists()).toBe(true)
    expect(check.text()).not.toContain('авто')
    expect(check.attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('.event-chip__main').attributes('aria-label')).toContain('не выполнено')
  })

  it('ручная отметка не показывает маркер «авто»', () => {
    const wrapper = mountChip({ completion: 'done', canToggle: true })
    expect(wrapper.classes()).toContain('is-done')
    expect(wrapper.find('.event-chip__auto').exists()).toBe(false)
    expect(wrapper.get('.event-chip__check').attributes('aria-label')).toBe('Снять отметку о выполнении')
  })

  it('не только цветом: статус есть в доступной подписи', () => {
    expect(mountChip({ status: 'current' }).get('button').attributes('aria-label')).toContain('идёт сейчас')
  })
})
