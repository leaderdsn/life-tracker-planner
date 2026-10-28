import type { Completion, SyncedCompletion } from '../model/types'

export const completionKey = (eventId: string, date: string) => `${eventId}|${date}`

function splitKey(key: string): [string, string] | null {
  const i = key.lastIndexOf('|')
  return i > 0 ? [key.slice(0, i), key.slice(i + 1)] : null
}

export type CompletionSyncState = {
  /** when each key was last changed on this device */
  stamps: Record<string, number>
  /** keys present in the previous remote snapshot; a known key that vanished was cleared elsewhere */
  known: Set<string>
}

/** Per-key last write wins; remote wins ties. */
export function mergeCompletions(
  local: Completion[],
  remote: Record<string, SyncedCompletion>,
  { stamps, known }: CompletionSyncState,
): Completion[] {
  const byKey = new Map(local.map((c) => [completionKey(c.eventId, c.date), c]))
  for (const [key, value] of Object.entries(remote)) {
    const parts = splitKey(key)
    if (parts && value.at >= (stamps[key] ?? 0)) {
      byKey.set(key, { eventId: parts[0], date: parts[1], status: value.status })
    }
  }
  for (const key of [...byKey.keys()]) {
    if (!(key in remote) && known.has(key)) byKey.delete(key)
  }
  return [...byKey.values()]
}
