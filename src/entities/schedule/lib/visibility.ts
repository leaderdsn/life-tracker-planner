import type { Occurrence, ScheduleEvent } from '../model/types'

/** Only the admin «Все» views use these helpers; guest, participant and personal views show every event. */
export const visibleInAll = (event: Pick<ScheduleEvent, 'showInAll'>): boolean => event.showInAll !== false

export const eventsVisibleInAll = (events: ScheduleEvent[]): ScheduleEvent[] => events.filter(visibleInAll)

export const occurrencesVisibleInAll = (occs: Occurrence[]): Occurrence[] =>
  occs.filter((o) => visibleInAll(o.event))
