import seed from './schedule.seed.json'

import { DEFAULT_SETTINGS, SCHEMA_VERSION } from '../schedule'

import type { EventCategory, ScheduleEvent, ScheduleSnapshot, Weekday } from '../../model/types'

const orUndefined = <T>(v: T | null | undefined): T | undefined => v ?? undefined

export function createSeedSnapshot(): ScheduleSnapshot {
  return {
    version: SCHEMA_VERSION,
    participants: seed.participants.map((p, order) => ({ ...p, order })),
    events: seed.events.map(
      (e): ScheduleEvent => ({
        id: e.id,
        participantIds: [...e.participantIds],
        day: e.day as Weekday,
        start: e.start,
        end: orUndefined(e.end),
        title: e.title,
        place: orUndefined(e.place),
        note: orUndefined('note' in e ? e.note : undefined),
        category: e.category as EventCategory,
        needsReview: orUndefined('needsReview' in e ? e.needsReview : undefined),
      }),
    ),
    completions: [],
    settings: { ...DEFAULT_SETTINGS, quietHours: DEFAULT_SETTINGS.quietHours && { ...DEFAULT_SETTINGS.quietHours } },
  }
}
