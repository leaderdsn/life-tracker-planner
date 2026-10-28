import { useScheduleStore } from '@/entities/schedule'
import { toIsoDate } from '@/shared/lib'

export function useToggleDone() {
  const store = useScheduleStore()

  function canToggle(date: string): boolean {
    return date <= toIsoDate(new Date())
  }

  function toggle(eventId: string, date: string, participantId?: string) {
    if (canToggle(date)) store.toggleCompletion(eventId, date, participantId)
  }

  return { canToggle, toggle }
}
