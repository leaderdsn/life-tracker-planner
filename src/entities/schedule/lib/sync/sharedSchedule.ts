import { SCHEMA_VERSION } from '../../config'
import { migrate } from '../persistence'
import { withoutProfile } from '../profiles'

import type { ScheduleSnapshot, SharedSchedule } from '../../model/types'

export function toShared(s: ScheduleSnapshot | SharedSchedule): SharedSchedule {
  return { version: s.version, participants: s.participants.map(withoutProfile), events: s.events, settings: s.settings }
}

/** Validates data from the wire; the database drops empty arrays and nulls, so they are restored. */
export function parseShared(raw: unknown): SharedSchedule | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const settings = (typeof r.settings === 'object' && r.settings !== null ? r.settings : {}) as Record<string, unknown>
  try {
    return toShared(
      migrate({
        version: SCHEMA_VERSION,
        participants: Array.isArray(r.participants) ? r.participants : [],
        events: Array.isArray(r.events) ? r.events : [],
        settings: { ...settings, quietHours: settings.quietHours ?? null },
      }),
    )
  } catch {
    return null
  }
}
