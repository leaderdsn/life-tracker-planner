import { minutes } from '@/shared/lib'

import type { Occurrence, Settings } from '@/entities/schedule'

export type ReminderKind = 'before' | 'start'

export type Reminder = { key: string; kind: ReminderKind; occ: Occurrence; minutesBefore: number }

const MINUTE = 60_000
const FIRE_WINDOW_MS = 2 * MINUTE

export const reminderKey = (occ: Occurrence, kind: ReminderKind) => `${occ.event.id}|${occ.date}|${kind}`

export function isQuietHours(quiet: Settings['quietHours'], now: number): boolean {
  if (!quiet) return false
  const d = new Date(now)
  const current = d.getHours() * 60 + d.getMinutes()
  const from = minutes(quiet.from)
  const to = minutes(quiet.to)
  if (from === to) return false
  return from < to ? current >= from && current < to : current >= from || current < to
}

export function dueReminders(
  occs: Occurrence[],
  settings: Settings,
  now: number,
  firedKeys: ReadonlySet<string>,
): Reminder[] {
  if (!settings.notificationsEnabled || isQuietHours(settings.quietHours, now)) return []

  const due: Reminder[] = []
  const check = (occ: Occurrence, kind: ReminderKind, at: number, minutesBefore: number) => {
    const key = reminderKey(occ, kind)
    if (at <= now && now - at <= FIRE_WINDOW_MS && !firedKeys.has(key)) {
      due.push({ key, kind, occ, minutesBefore })
    }
  }

  for (const occ of occs) {
    const before = occ.event.remindBefore ?? settings.defaultRemindBefore
    if (before > 0 && now < occ.startAt) check(occ, 'before', occ.startAt - before * MINUTE, before)
    check(occ, 'start', occ.startAt, 0)
  }
  return due
}

export function reminderText({ kind, occ, minutesBefore }: Reminder, nameOf: (id: string) => string): string {
  const { title, participantIds, place } = occ.event
  const who = participantIds.map(nameOf).join(', ')
  const prefix = kind === 'before' ? `Через ${minutesBefore} мин` : 'Началось'
  return `${prefix}: ${title} (${who})${place ? `, ${place}` : ''}`
}
