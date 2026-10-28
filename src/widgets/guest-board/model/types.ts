import type { EventStatus, Occurrence, Participant } from '@/entities/schedule'

export type BoardItem = {
  key: string
  occ: Occurrence
  status: EventStatus
  ringing: boolean
  seen: boolean
  participants: Participant[]
}
