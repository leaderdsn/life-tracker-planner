import { getCurrentScope, onScopeDispose, readonly, ref } from 'vue'

const COPIED_RESET_MS = 2000

/** Copies text to the clipboard and exposes a short-lived `copied` flag for UI feedback. */
export function useClipboard(resetAfterMs = COPIED_RESET_MS) {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }

    copied.value = true
    clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
    }, resetAfterMs)
    return true
  }

  if (getCurrentScope()) {
    onScopeDispose(() => clearTimeout(timer))
  }

  return { copied: readonly(copied), copy }
}
