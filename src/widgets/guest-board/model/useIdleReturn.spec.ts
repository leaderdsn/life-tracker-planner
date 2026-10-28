import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'

import { useIdleReturn } from './useIdleReturn'

const IDLE_MS = 60_000

function setup() {
  const onIdle = vi.fn()
  const enabled = ref(true)
  const timeout = ref(IDLE_MS)
  const wrapper = mount(
    defineComponent({
      setup() {
        useIdleReturn({ timeout: () => timeout.value, enabled: () => enabled.value, onIdle })
        return () => null
      },
    }),
  )
  return { onIdle, enabled, timeout, wrapper }
}

describe('useIdleReturn', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('срабатывает после заданного времени без действий', () => {
    const { onIdle } = setup()
    vi.advanceTimersByTime(IDLE_MS - 1)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it.each(['pointerdown', 'pointermove', 'keydown', 'wheel'])('событие %s откладывает возврат', (name) => {
    const { onIdle } = setup()
    vi.advanceTimersByTime(IDLE_MS - 1000)
    window.dispatchEvent(new Event(name))
    vi.advanceTimersByTime(IDLE_MS - 1000)
    expect(onIdle).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('не запускается, пока выключен, и стартует при включении', async () => {
    const { onIdle, enabled } = setup()
    enabled.value = false
    await Promise.resolve()
    vi.advanceTimersByTime(IDLE_MS * 2)
    expect(onIdle).not.toHaveBeenCalled()

    enabled.value = true
    await Promise.resolve()
    vi.advanceTimersByTime(IDLE_MS)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('подхватывает новое значение времени из настроек', async () => {
    const { onIdle, timeout } = setup()
    timeout.value = 30_000
    await Promise.resolve()
    vi.advanceTimersByTime(30_000)
    expect(onIdle).toHaveBeenCalledTimes(1)
  })

  it('после выключения компонента таймер и слушатели убраны', () => {
    const { onIdle, wrapper } = setup()
    wrapper.unmount()
    vi.advanceTimersByTime(IDLE_MS * 2)
    expect(onIdle).not.toHaveBeenCalled()
  })
})
