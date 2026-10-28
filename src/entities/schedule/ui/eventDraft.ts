import { WEEKDAYS } from '../config'
import { normalizeEvent } from '../lib'

import type { EventCategory, IsoDate, ScheduleEvent, Weekday } from '../model/types'

export type NewEvent = Omit<ScheduleEvent, 'id'>

export type EventDraft = {
  title: string
  days: Weekday[]
  oneOff: boolean
  date: IsoDate | null
  start: string
  end: string
  place: string
  remindBefore: number | null
  category: EventCategory
}

export const WORKDAYS: Weekday[] = WEEKDAYS.slice(0, 5)

export function createDraft(overrides: Partial<EventDraft> = {}): EventDraft {
  return {
    title: '',
    days: [],
    oneOff: false,
    date: null,
    start: '',
    end: '',
    place: '',
    remindBefore: null,
    category: 'activity',
    ...overrides,
  }
}

export function eventToDraft(event: ScheduleEvent): EventDraft {
  return createDraft({
    title: event.title,
    days: event.day ? [event.day] : [],
    oneOff: Boolean(event.date),
    date: event.date ?? null,
    start: event.start,
    end: event.end ?? '',
    place: event.place ?? '',
    remindBefore: event.remindBefore ?? null,
    category: event.category,
  })
}

/** One event per chosen weekday; throws ValidationError with a human message. */
export function draftToEvents(
  draft: EventDraft,
  participantIds: string[],
  base: Partial<ScheduleEvent> = {},
): NewEvent[] {
  const shared = {
    ...base,
    id: '',
    participantIds,
    title: draft.title,
    start: draft.start,
    end: draft.end,
    place: draft.place,
    category: draft.category,
    remindBefore: draft.remindBefore ?? undefined,
    day: undefined,
    date: undefined,
  }
  const raws: ScheduleEvent[] = draft.oneOff
    ? [{ ...shared, date: draft.date ?? undefined }]
    : draft.days.length > 0
      ? draft.days.map((day) => ({ ...shared, day }))
      : [shared]

  return raws.map((raw) => {
    return withoutId(normalizeEvent(raw))
  })
}

function withoutId(event: ScheduleEvent): NewEvent {
  return Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'id')) as NewEvent
}

export function toggleDay(days: Weekday[], day: Weekday): Weekday[] {
  return WEEKDAYS.filter((d) => (d === day ? !days.includes(d) : days.includes(d)))
}
