import { onScopeDispose, watchEffect } from 'vue'

import { playLoop, stopLoop } from '@/shared/lib'
import type { AlarmSoundName } from '@/shared/lib'

type Options = {
  active: () => boolean
  sound: () => AlarmSoundName
  volume: () => number
}

/** Loops the alarm sound while `active()` is true. */
export function useAlarmSound({ active, sound, volume }: Options) {
  watchEffect(() => {
    if (active()) playLoop(sound(), volume())
    else stopLoop()
  })
  onScopeDispose(stopLoop)
}
