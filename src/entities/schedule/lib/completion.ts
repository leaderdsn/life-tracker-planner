import type { Completion, Occurrence } from '../model/types'

export type EffectiveCompletion = 'done' | 'skipped' | 'auto' | null

/**
 * Explicit marks win. Otherwise, with auto-complete on, an occurrence counts as done once the participant's next
 * occurrence that day has started, or, for the last one, once it has ended. `dayOccurrences` are all occurrences of
 * one participant on the occurrence's date.
 */
export function effectiveCompletion(
  occ: Occurrence,
  dayOccurrences: Occurrence[],
  completions: Completion[],
  autoComplete: boolean,
  now: number,
): EffectiveCompletion {
  const explicit = completions.find((c) => c.eventId === occ.event.id && c.date === occ.date)
  if (explicit) return explicit.status
  if (!autoComplete) return null
  const later = dayOccurrences.filter((o) => o.startAt > occ.startAt)
  const doneAt = later.length ? Math.min(...later.map((o) => o.startAt)) : occ.endAt
  return doneAt <= now ? 'auto' : null
}

/** Same, for callers holding every occurrence: picks the participant's occurrences of that day itself. */
export function effectiveCompletionFor(
  occ: Occurrence,
  participantId: string,
  allOccurrences: Occurrence[],
  completions: Completion[],
  autoComplete: boolean,
  now: number,
): EffectiveCompletion {
  const day = allOccurrences.filter((o) => o.date === occ.date && o.event.participantIds.includes(participantId))
  return effectiveCompletion(occ, day, completions, autoComplete, now)
}

export const isDoneState = (state: EffectiveCompletion) => state === 'done' || state === 'auto'

