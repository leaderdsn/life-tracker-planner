import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'

import { unlockAudio } from '@/shared/lib'

type WakeLockSentinelLike = { release: () => Promise<void> }
type WakeLockNavigator = { wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> } }

/** Audio unlock, fullscreen and screen wake lock for the guest screen; all of them need a user gesture. */
export function useGuestSession() {
  const started = ref(false)
  const fullscreen = ref(Boolean(document.fullscreenElement))
  let sentinel: WakeLockSentinelLike | null = null

  async function acquireWakeLock() {
    const api = (navigator as WakeLockNavigator).wakeLock
    if (!api || sentinel) return
    try {
      sentinel = await api.request('screen')
    } catch {
      sentinel = null
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen?.()
    } catch {
      // Not allowed here (for example inside an iframe); the screen still works windowed.
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen?.().catch(() => undefined)
    else await enterFullscreen()
  }

  async function start() {
    started.value = true
    await Promise.all([unlockAudio(), enterFullscreen(), acquireWakeLock()])
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible' || !started.value) return
    sentinel = null
    void acquireWakeLock()
  }

  const onFullscreenChange = () => (fullscreen.value = Boolean(document.fullscreenElement))
  const blockContextMenu = (event: Event) => event.preventDefault()

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibility)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    document.addEventListener('contextmenu', blockContextMenu)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('contextmenu', blockContextMenu)
    void sentinel?.release().catch(() => undefined)
  })

  return { started: readonly(started), fullscreen: readonly(fullscreen), start, toggleFullscreen }
}
