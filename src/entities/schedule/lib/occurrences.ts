import { addDays, minutes, parseIsoDate, toIsoDate, weekdayOf } from '@/shared/lib'

import type { EventStatus, Occurrence, ProgressPeriod, ScheduleEvent } from '../model/types'

const DEFAULT_DURATION_MS = 30 * 60_000

function atTime(date: string, time: string): number {
  const d = parseIsoDate(date)
  d.setMinutes(minutes(time))
  return d.getTime()
}

function occurrenceOn(event: ScheduleEvent, date: string): Occurrence {
  const startAt = atTime(date, event.start)
  const endAt = event.end ? atTime(date, event.end) : startAt + DEFAULT_DURATION_MS
  return { event, date, startAt, endAt }
}

export function occurrences(events: ScheduleEvent[], from: Date, to: Date): Occurrence[] {
  const result: Occurrence[] = []
  const last = toIsoDate(to)
  for (let d = from; toIsoDate(d) <= last; d = addDays(d, 1)) {
    const date = toIsoDate(d)
    const weekday = weekdayOf(d)
    for (const e of events) {
      if (e.date ? e.date === date : e.day === weekday) result.push(occurrenceOn(e, date))
    }
  }
  return result.sort((a, b) => a.startAt - b.startAt || a.event.title.localeCompare(b.event.title, 'ru'))
}

export function eventStatus(occ: Occurrence, dayOccurrences: Occurrence[], now: number): EventStatus {
  if (occ.startAt <= now && now < occ.endAt) return 'current'
  if (occ.endAt <= now) return 'past'
  const isNext = occ.event.participantIds.some((id) =>
    dayOccurrences.every(
      (o) =>
        o === occ || !o.event.participantIds.includes(id) || o.startAt <= now || o.startAt >= occ.startAt,
    ),
  )
  return isNext ? 'next' : 'upcoming'
}

export function periodRange(period: ProgressPeriod, anchor: Date): { from: Date; to: Date } {
  const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate())
  if (period === 'day') return { from: day, to: day }
  if (period === 'week') {
    const from = addDays(day, -((day.getDay() + 6) % 7))
    return { from, to: addDays(from, 6) }
  }
  return {
    from: new Date(day.getFullYear(), day.getMonth(), 1),
    to: new Date(day.getFullYear(), day.getMonth() + 1, 0),
  }
}
