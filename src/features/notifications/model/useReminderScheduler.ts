import { getCurrentScope, onScopeDispose } from 'vue'

import { occurrences, useScheduleStore } from '@/entities/schedule'
import { playOnce } from '@/shared/lib'

import { loadFired, saveFired } from './firedStorage'
import { beep, showNotification } from './notify'
import { dueReminders, reminderText } from './reminders'

const TICK_MS = 30_000

type Options = { onToast: (message: string) => void }

export function useReminderScheduler({ onToast }: Options) {
  const store = useScheduleStore()
  let timer: ReturnType<typeof setInterval> | undefined

  function tick() {
    const now = Date.now()
    const fired = loadFired(now)
    const today = new Date(now)
    const occs = store.isParticipant ? store.ownOccurrences(today, today) : occurrences(store.events, today, today)
    const due = dueReminders(occs, store.settings, now, new Set(Object.keys(fired)))
    if (!due.length) return

    const nameOf = (id: string) => store.participantById(id)?.name ?? id
    for (const reminder of due) {
      fired[reminder.key] = now
      const text = reminderText(reminder, nameOf)
      if (!showNotification(text)) onToast(text)
    }
    saveFired(fired)
    if (!store.settings.sound) return
    if (store.isParticipant) {
      playOnce(store.ownParticipant?.alarmSound ?? store.settings.alarmSound, store.settings.alarmVolume)
    } else beep()
  }

  function start() {
    if (timer) return
    tick()
    timer = setInterval(tick, TICK_MS)
  }

  function stop() {
    clearInterval(timer)
    timer = undefined
  }

  start()
  if (getCurrentScope()) onScopeDispose(stop)

  return { stop, tick }
}
