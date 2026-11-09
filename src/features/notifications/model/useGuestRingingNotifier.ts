import { getCurrentScope, onScopeDispose, watch } from 'vue'

import { useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'

import { loadFired, saveFired } from './firedStorage'
import { showNotification } from './notify'

type Options = { onToast: (message: string) => void }

export const ringingFiredKey = (key: string) => `ringing|${key}`

export function ringingText(title: string, names: string[]): string {
  return `Звенит у гостя: ${title}${names.length ? ` (${names.join(', ')})` : ''}`
}

/** Admin device: one system notification per newly ringing guest alarm. */
export function useGuestRingingNotifier({ onToast }: Options) {
  const device = useDeviceStore()
  const store = useScheduleStore()
  const sync = useSyncStore()

  const stop = watch(
    () => Object.keys(sync.ringing).join('\n'),
    () => {
      if (device.role !== 'admin' || !store.settings.notificationsEnabled) return
      const now = Date.now()
      const fired = loadFired(now)
      let changed = false
      for (const [key, info] of Object.entries(sync.ringing)) {
        const firedKey = ringingFiredKey(key)
        if (firedKey in fired) continue
        fired[firedKey] = now
        changed = true
        const text = ringingText(info.title, info.participantNames)
        if (!showNotification(text, { tag: firedKey, silent: device.soundOff })) onToast(text)
      }
      if (changed) saveFired(fired)
    },
    { immediate: true },
  )

  if (getCurrentScope()) onScopeDispose(stop)
  return { stop }
}
