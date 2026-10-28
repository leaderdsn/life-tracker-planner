import { addDays, minutes, parseIsoDate, toIsoDate, weekdayOf } from '@/shared/lib'

import { WEEKDAYS } from '../config'

import type { Grid, GridRow, ScheduleEvent, Weekday } from '../model/types'

type GridOptions = { participantIds?: string[]; days?: Weekday[] }

export function eventsForWeek(events: ScheduleEvent[], weekStart: Date): ScheduleEvent[] {
  const from = toIsoDate(weekStart)
  const to = toIsoDate(addDays(weekStart, 6))
  const result: ScheduleEvent[] = []
  for (const e of events) {
    if (e.date) {
      if (e.date >= from && e.date <= to) result.push({ ...e, day: weekdayOf(parseIsoDate(e.date)) as Weekday })
    } else if (e.day) {
      result.push(e)
    }
  }
  return result
}

const byStartThenTitle = (a: ScheduleEvent, b: ScheduleEvent) =>
  minutes(a.start) - minutes(b.start) || a.title.localeCompare(b.title, 'ru')

export function buildGrid(events: ScheduleEvent[], { participantIds, days }: GridOptions = {}): Grid {
  const filtered = participantIds
    ? events.filter((e) => e.participantIds.some((id) => participantIds.includes(id)))
    : events

  const shown =
    days ??
    WEEKDAYS.filter((d) => d !== 'sun' || filtered.some((e) => e.day === 'sun'))
  const visible = filtered.filter((e) => e.day && shown.includes(e.day))

  const starts = [...new Set(visible.map((e) => e.start))].sort((a, b) => minutes(a) - minutes(b))
  const rows: GridRow[] = starts.map((time) => {
    const cells: GridRow['cells'] = {}
    for (const e of visible.filter((v) => v.start === time).sort(byStartThenTitle)) {
      const day = e.day as Weekday
      ;(cells[day] ??= []).push(e)
    }
    return { time, cells }
  })

  return { days: shown, rows }
}
