import { ACK_TTL_MS } from '../config'

import type { AlarmAck, AlarmKey, IsoDate, Occurrence, Settings } from '../model/types'

const MINUTE_MS = 60_000

export const alarmKey = (eventId: string, date: IsoDate): AlarmKey => `${eventId}|${date}`

/** Occurrences inside [start - lead, end) that nobody has acknowledged yet. */
export function activeAlarms(
  occurrences: Occurrence[],
  acks: Record<AlarmKey, AlarmAck>,
  settings: Pick<Settings, 'guestAlarmLead'>,
  now: number,
): Occurrence[] {
  return occurrences.filter((o) => {
    const lead = (o.event.remindBefore ?? settings.guestAlarmLead) * MINUTE_MS
    return o.startAt - lead <= now && now < o.endAt && !(alarmKey(o.event.id, o.date) in acks)
  })
}

export function pruneAcks(
  acks: Record<AlarmKey, AlarmAck>,
  now: number,
  ttl = ACK_TTL_MS,
): Record<AlarmKey, AlarmAck> {
  return Object.fromEntries(Object.entries(acks).filter(([, ack]) => now - ack.at <= ttl))
}
