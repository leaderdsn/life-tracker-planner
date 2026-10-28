import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

/** Fires `onComplete` once the press has been held for `durationMs`; releasing earlier cancels it. */
export function useLongPress(onComplete: () => void, durationMs: number) {
  const holding = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  function start() {
    if (holding.value) return
    holding.value = true
    timer = setTimeout(() => {
      holding.value = false
      onComplete()
    }, durationMs)
  }

  function cancel() {
    clearTimeout(timer)
    holding.value = false
  }

  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))

  return { holding: readonly(holding), start, cancel }
}
