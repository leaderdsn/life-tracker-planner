import { randomId } from '../ids'

import type { Completion, Participant, ScheduleEvent } from '../../model/types'
import type { ParsedImport, RowError } from './rows'

export type ImportMode = 'replace' | 'merge'

export type ImportSummary = {
  mode: ImportMode
  added: number
  skipped: number
  removed: number
  newParticipants: number
  errors: RowError[]
}

export type ImportPlan = {
  result: { participants: Participant[]; events: ScheduleEvent[]; completions: Completion[] }
  summary: ImportSummary
}

type Current = { participants: Participant[]; events: ScheduleEvent[]; completions: Completion[] }

const dedupeKey = (e: Omit<ScheduleEvent, 'id'>) =>
  [[...e.participantIds].sort().join(','), e.date ?? e.day, e.start, e.title.toLowerCase()].join('|')

export function planImport(current: Current, parsed: ParsedImport, mode: ImportMode): ImportPlan {
  const kept = mode === 'merge' ? current.events : []
  const seen = new Set(kept.map(dedupeKey))
  const taken = new Set(kept.map((e) => e.id))
  const added: ScheduleEvent[] = []
  let skipped = 0
  for (const e of parsed.events) {
    const key = dedupeKey(e)
    if (seen.has(key)) {
      skipped++
      continue
    }
    seen.add(key)
    const id = randomId(taken)
    taken.add(id)
    added.push({ ...e, id })
  }

  const events = [...kept, ...added]
  const alive = new Set(events.map((e) => e.id))
  return {
    result: {
      participants: [...current.participants, ...parsed.participants],
      events,
      completions: current.completions.filter((c) => alive.has(c.eventId)),
    },
    summary: {
      mode,
      added: added.length,
      skipped,
      removed: mode === 'replace' ? current.events.length : 0,
      newParticipants: parsed.participants.length,
      errors: parsed.errors,
    },
  }
}
