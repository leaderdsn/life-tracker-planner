import { computed, getCurrentScope, onScopeDispose, ref, watch } from 'vue'

import {
  activeAlarms,
  alarmKey,
  occurrences,
  useDeviceStore,
  useScheduleStore,
  useSyncStore,
} from '@/entities/schedule'
import type { AlarmKey } from '@/entities/schedule'

const TICK_MS = 1000

/** Guest screen only: occurrences ringing right now; mirrors them to the admin and consumes acknowledgements. */
export function useGuestAlarms() {
  const device = useDeviceStore()
  const schedule = useScheduleStore()
  const sync = useSyncStore()

  const now = ref(Date.now())
  const timer = setInterval(() => (now.value = Date.now()), TICK_MS)
  if (getCurrentScope()) onScopeDispose(() => clearInterval(timer))

  const ringing = computed(() => {
    if (device.role !== 'guest') return []
    const today = new Date(now.value)
    return activeAlarms(occurrences(schedule.events, today, today), sync.acks, schedule.settings, now.value)
  })

  // Publish start/stop of each alarm so the admin can see and silence it.
  const published = new Set<AlarmKey>()
  watch(
    ringing,
    (list) => {
      const keys = new Set<AlarmKey>()
      for (const o of list) {
        const key = alarmKey(o.event.id, o.date)
        keys.add(key)
        if (published.has(key)) continue
        published.add(key)
        void sync.setRinging(key, {
          title: o.event.title,
          participantNames: o.event.participantIds.map((id) => schedule.participantById(id)?.name ?? id),
          startedAt: Date.now(),
        })
      }
      for (const key of published) {
        if (keys.has(key)) continue
        published.delete(key)
        void sync.setRinging(key, null)
      }
    },
    { immediate: true },
  )

  function ack(key: AlarmKey) {
    void sync.ack(key, 'guest')
  }

  return { ringing, ack, now }
}
