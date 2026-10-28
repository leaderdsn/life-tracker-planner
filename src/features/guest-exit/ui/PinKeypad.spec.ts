import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import PinKeypad from './PinKeypad.vue'

function mountKeypad(props: { error?: string; busy?: boolean } = {}) {
  return mount(PinKeypad, { props })
}

const press = async (wrapper: ReturnType<typeof mountKeypad>, digits: string) => {
  for (const digit of digits) await wrapper.get(`[data-key="${digit}"]`).trigger('click')
}

const filled = (wrapper: ReturnType<typeof mountKeypad>) => wrapper.findAll('.pin-keypad__dot.is-filled').length

describe('PinKeypad', () => {
  it('заполняет точки по мере ввода и ограничивает длину шестью цифрами', async () => {
    const wrapper = mountKeypad()
    await press(wrapper, '123')
    expect(filled(wrapper)).toBe(3)
    await press(wrapper, '45678')
    expect(filled(wrapper)).toBe(6)
  })

  it('стирает последнюю цифру', async () => {
    const wrapper = mountKeypad()
    await press(wrapper, '1234')
    await wrapper.get('[data-key="backspace"]').trigger('click')
    expect(filled(wrapper)).toBe(3)
    await wrapper.get('[data-key="backspace"]').trigger('click')
    await wrapper.get('[data-key="backspace"]').trigger('click')
    await wrapper.get('[data-key="backspace"]').trigger('click')
    await wrapper.get('[data-key="backspace"]').trigger('click')
    expect(filled(wrapper)).toBe(0)
  })

  it('не отправляет PIN короче четырёх цифр', async () => {
    const wrapper = mountKeypad()
    await press(wrapper, '123')
    expect(wrapper.get('[data-key="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-key="submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('отправляет введённый PIN', async () => {
    const wrapper = mountKeypad()
    await press(wrapper, '4821')
    await wrapper.get('[data-key="submit"]').trigger('click')
    expect(wrapper.emitted('submit')).toEqual([['4821']])
  })

  it('понимает цифры, Backspace и Enter с клавиатуры', async () => {
    const wrapper = mountKeypad()
    for (const key of ['1', '2', '3', '4', '9']) await wrapper.trigger('keydown', { key })
    await wrapper.trigger('keydown', { key: 'Backspace' })
    await wrapper.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submit')).toEqual([['1234']])
  })

  it('очищается через clear() и показывает ошибку', async () => {
    const wrapper = mountKeypad({ error: 'Неверный PIN' })
    await press(wrapper, '1111')
    ;(wrapper.vm as unknown as { clear: () => void }).clear()
    await wrapper.vm.$nextTick()
    expect(filled(wrapper)).toBe(0)
    expect(wrapper.text()).toContain('Неверный PIN')
  })

  it('отмена отправляет cancel', async () => {
    const wrapper = mountKeypad()
    await wrapper.get('.pin-keypad__cancel').trigger('click')
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('во время проверки не принимает ввод', async () => {
    const wrapper = mountKeypad({ busy: true })
    await press(wrapper, '1234')
    expect(filled(wrapper)).toBe(0)
  })
})
