import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import TechnologyCard from './TechnologyCard.vue'
import { getTechnologyLogo } from './technologyLogos'

import type { Technology } from '../model/types'

const technology: Technology = {
  id: 'vue',
  name: 'Vue 3',
  packageName: 'vue',
  version: '3.5.0',
  category: 'core',
  monogram: 'Vue',
  accent: '#42b883',
  description: 'Framework',
  purpose: 'Components',
  docsUrl: 'https://vuejs.org',
}

describe('TechnologyCard', () => {
  it('показывает название, версию и категорию', () => {
    const wrapper = mount(TechnologyCard, { props: { technology } })

    expect(wrapper.text()).toContain('Vue 3')
    expect(wrapper.text()).toContain('v3.5.0')
    expect(wrapper.text()).toContain('Основа')
  })

  it('ссылается на документацию в новой вкладке', () => {
    const wrapper = mount(TechnologyCard, { props: { technology } })
    const link = wrapper.get('a')

    expect(link.attributes('href')).toBe('https://vuejs.org')
    expect(link.attributes('target')).toBe('_blank')
  })

  it('показывает логотип технологии в бейдже', () => {
    const wrapper = mount(TechnologyCard, { props: { technology } })

    const logo = getTechnologyLogo('vue')

    expect(logo).not.toBeNull()
    expect(wrapper.get('.technology-card__badge img').attributes('src')).toBe(logo)
  })

  it('показывает монограмму, когда логотипа нет', () => {
    const wrapper = mount(TechnologyCard, {
      props: { technology: { ...technology, id: 'unknown-tech', monogram: 'UT' } },
    })

    expect(wrapper.find('.technology-card__badge img').exists()).toBe(false)
    expect(wrapper.get('.technology-card__badge').text()).toBe('UT')
  })

  it('показывает метку методологии без префикса версии', () => {
    const wrapper = mount(TechnologyCard, {
      props: { technology: { ...technology, packageName: null, version: 'методология' } },
    })

    expect(wrapper.text()).toContain('методология')
    expect(wrapper.text()).not.toContain('vметодология')
  })
})
