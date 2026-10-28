import { minutes } from '@/shared/lib'

import type { Conflict, ScheduleEvent } from '../model/types'

const DEFAULT_DURATION = 30

const span = (e: ScheduleEvent): [number, number] => {
  const start = minutes(e.start)
  return [start, e.end ? minutes(e.end) : start + DEFAULT_DURATION]
}

export function findConflicts(events: ScheduleEvent[]): Conflict[] {
  const groups = new Map<string, ScheduleEvent[]>()
  for (const e of events) {
    const day = e.date ?? e.day
    if (!day) continue
    for (const participantId of e.participantIds) {
      const key = `${participantId}|${day}`
      const list = groups.get(key)
      if (list) list.push(e)
      else groups.set(key, [e])
    }
  }

  const conflicts: Conflict[] = []
  for (const [key, list] of groups) {
    const [participantId = '', day = ''] = key.split('|')
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i] as ScheduleEvent
        const b = list[j] as ScheduleEvent
        const [as, ae] = span(a)
        const [bs, be] = span(b)
        if (as < be && bs < ae) conflicts.push({ participantId, eventIds: [a.id, b.id], day })
      }
    }
  }
  return conflicts
}
