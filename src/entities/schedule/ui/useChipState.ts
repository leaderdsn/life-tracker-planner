import { computed, onScopeDispose, ref } from 'vue'

import { parseIsoDate, toIsoDate } from '@/shared/lib'

import { initialLabels } from './participantView'
import { effectiveCompletionFor, eventStatus, isDoneState, occurrences } from '../lib'
import { useScheduleStore } from '../model/scheduleStore'

import type { EffectiveCompletion } from '../lib'
import type { EventStatus, Occurrence, ScheduleEvent } from '../model/types'

const TICK_MS = 30_000

export type ChipState = { status: EventStatus; done: boolean; completion: EffectiveCompletion; conflict: boolean }

export function useChipState() {
  const store = useScheduleStore()
  const now = ref(Date.now())
  const timer = setInterval(() => {
    now.value = Date.now()
  }, TICK_MS)
  onScopeDispose(() => clearInterval(timer))

  const todayIso = computed(() => toIsoDate(new Date(now.value)))

  const stateFor = computed(() => {
    const dayCache = new Map<string, Occurrence[]>()
    const dayOccurrences = (date: string) => {
      let cached = dayCache.get(date)
      if (!cached) {
        const day = parseIsoDate(date)
        cached = occurrences(store.events, day, day)
        dayCache.set(date, cached)
      }
      return cached
    }

    return (event: ScheduleEvent, date: string, participantId?: string): ChipState => {
      const conflict = store.conflictIds.has(event.id)
      const dayOccs = dayOccurrences(date)
      const occ = dayOccs.find((o) => o.event.id === event.id)
      const pid = participantId && event.participantIds.includes(participantId) ? participantId : event.participantIds[0]
      const completion: EffectiveCompletion =
        occ && pid
          ? effectiveCompletionFor(occ, pid, dayOccs, store.completions, store.settings.autoComplete, now.value)
          : (store.completionFor(event.id, date)?.status ?? null)
      let status: EventStatus = 'upcoming'
      if (date < todayIso.value) status = 'past'
      else if (date === todayIso.value && occ) status = eventStatus(occ, dayOccs, now.value)
      return { status, done: isDoneState(completion), completion, conflict }
    }
  })

  const labels = computed(() => initialLabels(store.sortedParticipants))

  return { now, todayIso, stateFor, labels }
}
