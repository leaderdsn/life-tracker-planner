import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { useLegendCollapsed } from '../model/useLegendCollapsed'
import ScheduleLegend from './ScheduleLegend.vue'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
  useLegendCollapsed().collapsed.value = false
})

function mountLegend() {
  return mount(ScheduleLegend, { global: { stubs: { LegendContent: true } } })
}

describe('ScheduleLegend toggle', () => {
  it('кнопка без текста: только значок, подсказка и aria-label', () => {
    const toggle = mountLegend().get('.schedule-legend__toggle')
    expect(toggle.text()).toBe('')
    expect(toggle.find('svg').exists()).toBe(true)
    expect(toggle.attributes('title')).toBe('Скрыть обозначения')
    expect(toggle.attributes('aria-label')).toBe('Скрыть обозначения')
    expect(toggle.attributes('aria-expanded')).toBe('true')
  })

  it('в свёрнутом виде подпись меняется, остаётся только полоска с кнопкой', async () => {
    const wrapper = mountLegend()
    await wrapper.get('.schedule-legend__toggle').trigger('click')
    await nextTick()
    const toggle = wrapper.get('.schedule-legend__toggle')
    expect(wrapper.classes()).toContain('is-collapsed')
    expect(toggle.attributes('title')).toBe('Показать обозначения')
    expect(toggle.attributes('aria-label')).toBe('Показать обозначения')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.get('.schedule-legend__body').isVisible()).toBe(false)
  })
})
