import { minutes, normalizeTitle, validateTime } from '@/shared/lib'

import { WEEKDAYS } from '../config'

import type { ScheduleEvent } from '../model/types'

export type ValidationField = 'title' | 'start' | 'end' | 'participants' | 'day' | 'date'

export class ValidationError extends Error {
  field: ValidationField

  constructor(field: ValidationField, message: string) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const clean = (s: string | undefined) => s?.trim().replace(/[ \t]+/g, ' ') || undefined

function timeOrThrow(field: 'start' | 'end', input: unknown): string {
  const res = validateTime(input)
  if ('error' in res) throw new ValidationError(field, res.error)
  return res.value
}

export function normalizeEvent(e: ScheduleEvent): ScheduleEvent {
  const title = normalizeTitle(e.title ?? '')
  if (!title) throw new ValidationError('title', 'Введите название')

  const start = timeOrThrow('start', e.start)
  const hasEnd = e.end !== undefined && e.end !== null && String(e.end).trim() !== ''
  const end = hasEnd ? timeOrThrow('end', e.end) : undefined
  if (end && minutes(end) <= minutes(start)) {
    throw new ValidationError('end', 'Окончание раньше начала')
  }

  if (!e.participantIds?.length) throw new ValidationError('participants', 'Выберите хотя бы одного участника')

  if (!e.day && !e.date) throw new ValidationError('day', 'Укажите день недели или дату')
  if (e.day && !WEEKDAYS.includes(e.day)) throw new ValidationError('day', 'Неизвестный день недели')
  if (e.date && !ISO_DATE.test(e.date)) throw new ValidationError('date', 'Дата указана неверно')

  const out: ScheduleEvent = {
    id: e.id,
    participantIds: [...new Set(e.participantIds)],
    start,
    title,
    category: e.category,
  }
  if (e.day) out.day = e.day
  if (e.date) out.date = e.date
  if (end) out.end = end
  const place = clean(e.place)
  if (place) out.place = place
  const note = e.note?.trim()
  if (note) out.note = note
  if (e.remindBefore !== undefined && e.remindBefore !== null) out.remindBefore = e.remindBefore
  if (e.needsReview) out.needsReview = e.needsReview
  return out
}
