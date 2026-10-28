import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import GuestEventCard from './GuestEventCard.vue'

import type { EventStatus, Participant } from '@/entities/schedule'

const participant: Participant = { id: 'r', name: 'Руслан', color: '#cfe2ff', order: 0 }

function mountCard(props: { status?: EventStatus; seen?: boolean; ringing?: boolean } = {}) {
  return mount(GuestEventCard, {
    props: { title: 'Вокал', time: '09:00', place: 'Студия', participants: [participant], status: 'upcoming', ...props },
  })
}

describe('GuestEventCard', () => {
  it('в обычном состоянии это не кнопка и не звенит', () => {
    const wrapper = mountCard()
    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.text()).toContain('Вокал')
    expect(wrapper.text()).toContain('09:00')
    expect(wrapper.text()).not.toContain('Нажмите')
  })

  it('звенящая карточка — кнопка с подсказкой и колокольчиком, нажатие отключает', async () => {
    const wrapper = mountCard({ ringing: true })
    expect(wrapper.element.tagName).toBe('BUTTON')
    expect(wrapper.classes()).toContain('is-ringing')
    expect(wrapper.text()).toContain('Нажмите, чтобы отключить')
    expect(wrapper.find('.pi-bell').exists()).toBe(true)
    await wrapper.trigger('click')
    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })

  it('обычная карточка не отправляет dismiss по нажатию', async () => {
    const wrapper = mountCard({ status: 'current' })
    await wrapper.trigger('click')
    expect(wrapper.emitted('dismiss')).toBeUndefined()
  })

  it('увиденная карточка помечена галочкой и приглушена', () => {
    const wrapper = mountCard({ seen: true })
    expect(wrapper.classes()).toContain('is-seen')
    expect(wrapper.find('.pi-check-circle').exists()).toBe(true)
    expect(wrapper.text()).toContain('Увидено')
  })

  it.each([
    ['current', 'is-current', 'Сейчас'],
    ['next', 'is-next', 'Дальше'],
    ['past', 'is-past', ''],
  ] as const)('статус %s даёт класс %s', (status, cls, tag) => {
    const wrapper = mountCard({ status })
    expect(wrapper.classes()).toContain(cls)
    expect(wrapper.text()).toContain(tag)
  })

  it('во время звонка не показывает галочку, даже если уже было увидено', () => {
    const wrapper = mountCard({ ringing: true, seen: true })
    expect(wrapper.find('.pi-check-circle').exists()).toBe(false)
  })
})
