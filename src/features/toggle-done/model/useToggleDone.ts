import { computed } from 'vue'

import { canEdit, canToggle as roleCanToggle, useDeviceStore, useScheduleStore } from '@/entities/schedule'
import type { ScheduleEvent } from '@/entities/schedule'
import { toIsoDate } from '@/shared/lib'

export function useToggleDone() {
  const store = useScheduleStore()
  const device = useDeviceStore()

  /** Participants see their schedule but never open an editor. */
  const readOnly = computed(() => !canEdit(device.role))

  function canToggle(date: string, event?: Pick<ScheduleEvent, 'participantIds'>): boolean {
    if (date > toIsoDate(new Date())) return false
    return event ? roleCanToggle(device.role, device.participantId, event) : canEdit(device.role)
  }

  function toggle(eventId: string, date: string, participantId?: string) {
    const event = store.events.find((e) => e.id === eventId)
    if (canToggle(date, event)) store.toggleCompletion(eventId, date, participantId)
  }

  return { canToggle, toggle, readOnly }
}
