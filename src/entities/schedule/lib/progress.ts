import { effectiveCompletion, isDoneState } from './completion'

import type { Completion, Occurrence, Progress } from '../model/types'

type Options = { autoComplete?: boolean; now?: number }

export function progress(
  completions: Completion[],
  occs: Occurrence[],
  participantIds: string[],
  { autoComplete = false, now = Date.now() }: Options = {},
): Progress {
  const result: Progress = Object.fromEntries(participantIds.map((id) => [id, { done: 0, total: 0 }]))
  const days = new Map<string, Occurrence[]>()
  for (const occ of occs) {
    for (const id of occ.event.participantIds) {
      const key = `${id}|${occ.date}`
      days.set(key, [...(days.get(key) ?? []), occ])
    }
  }

  for (const occ of occs) {
    for (const id of occ.event.participantIds) {
      const counter = result[id]
      if (!counter) continue
      counter.total++
      const state = effectiveCompletion(occ, days.get(`${id}|${occ.date}`) ?? [], completions, autoComplete, now)
      if (isDoneState(state)) counter.done++
    }
  }
  return result
}
