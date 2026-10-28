import type { DeviceRole, ScheduleEvent } from '../model/types'

export const canEdit = (role: DeviceRole): boolean => role === 'admin'

export function canToggle(
  role: DeviceRole,
  participantId: string | null,
  event: Pick<ScheduleEvent, 'participantIds'> | undefined,
): boolean {
  if (!event) return false
  if (role === 'admin') return true
  return role === 'participant' && participantId !== null && event.participantIds.includes(participantId)
}
