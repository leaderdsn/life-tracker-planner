import { getCurrentScope, onScopeDispose, watch } from 'vue'

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'] as const

type Options = {
  /** milliseconds without interaction */
  timeout: () => number
  /** the timer only runs while this is true */
  enabled: () => boolean
  onIdle: () => void
}

export function useIdleReturn({ timeout, enabled, onIdle }: Options) {
  let timer: ReturnType<typeof setTimeout> | undefined

  function stop() {
    clearTimeout(timer)
    timer = undefined
  }

  function reset() {
    stop()
    if (!enabled()) return
    timer = setTimeout(() => {
      timer = undefined
      onIdle()
    }, timeout())
  }

  for (const name of ACTIVITY_EVENTS) window.addEventListener(name, reset, { passive: true })
  watch([enabled, timeout], reset, { immediate: true })

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop()
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, reset)
    })
  }

  return { reset }
}
