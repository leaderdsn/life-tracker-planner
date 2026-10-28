import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import Avatar from './UserAvatar.vue'

describe('Avatar', () => {
  it('shows the initial when there is no photo', () => {
    const wrapper = mount(Avatar, { props: { name: 'рудольф', color: '#CFE2FF' } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('Р')
  })

  it('prefers an explicit label', () => {
    const wrapper = mount(Avatar, { props: { name: 'Рудольф', color: '#CFE2FF', label: 'Ру' } })
    expect(wrapper.text()).toBe('Ру')
  })

  it('shows the photo and falls back to the initial if it fails to load', async () => {
    const wrapper = mount(Avatar, { props: { name: 'Анна', color: '#CFE2FF', src: 'data:image/png;base64,AAAA' } })
    expect(wrapper.find('img').exists()).toBe(true)
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('А')
  })
})
