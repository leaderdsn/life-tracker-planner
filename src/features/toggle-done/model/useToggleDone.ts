import { toIsoDate } from '@/shared/lib'

import { useScheduleStore } from '@/entities/schedule'

export function useToggleDone() {
  const store = useScheduleStore()

  function canToggle(date: string): boolean {
    return date <= toIsoDate(new Date())
  }

  function toggle(eventId: string, date: string) {
    if (canToggle(date)) store.toggleCompletion(eventId, date)
  }

  return { canToggle, toggle }
}
