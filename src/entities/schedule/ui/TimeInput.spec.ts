import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TimeInput from './TimeInput.vue'

function feedbackFor(value: string) {
  const wrapper = mount(TimeInput, { props: { id: 't', label: 'Начало', modelValue: value } })
  return wrapper.get('.time-input__feedback')
}

describe('TimeInput', () => {
  it.each([
    ['8.30', '8.30 → 08:30'],
    ['830', '830 → 08:30'],
    ['08:30', '08:30'],
  ])('показывает нормализованное время для «%s»', (raw, expected) => {
    const feedback = feedbackFor(raw)
    expect(feedback.text()).toBe(expected)
    expect(feedback.classes()).toContain('is-ok')
  })

  it('объясняет ошибку человеческим языком', () => {
    const feedback = feedbackFor('25:70')
    expect(feedback.classes()).toContain('is-error')
    expect(feedback.text()).not.toBe('')
  })

  it('подсказывает, когда поле пустое', () => {
    expect(feedbackFor('').classes()).toContain('is-hint')
  })
})
