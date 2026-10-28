import type { Completion, Occurrence, Progress } from '../model/types'

export function progress(completions: Completion[], occs: Occurrence[], participantIds: string[]): Progress {
  const done = new Set(completions.filter((c) => c.status === 'done').map((c) => `${c.eventId}|${c.date}`))
  const result: Progress = Object.fromEntries(participantIds.map((id) => [id, { done: 0, total: 0 }]))

  for (const occ of occs) {
    const isDone = done.has(`${occ.event.id}|${occ.date}`)
    for (const id of occ.event.participantIds) {
      const counter = result[id]
      if (!counter) continue
      counter.total++
      if (isDone) counter.done++
    }
  }
  return result
}
