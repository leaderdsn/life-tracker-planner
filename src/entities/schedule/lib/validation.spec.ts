import { describe, expect, it } from 'vitest'

import { normalizeEvent } from './validation'

import type { ScheduleEvent } from '../model/types'

const base: ScheduleEvent = {
  id: 'e1',
  participantIds: ['a'],
  day: 'mon',
  start: '8.30',
  title: 'вокал',
  category: 'activity',
}

describe('normalizeEvent', () => {
  it('normalizes fields and drops empty optionals', () => {
    const res = normalizeEvent({ ...base, end: '9:15', place: '  ', note: ' ', title: ' Вокал,ДДТ ' })
    expect(res).toEqual({
      id: 'e1',
      participantIds: ['a'],
      day: 'mon',
      start: '08:30',
      end: '09:15',
      title: 'Вокал, ДДТ',
      category: 'activity',
    })
    expect(Object.keys(res)).not.toContain('place')
  })

  it('keeps place, note, remindBefore and needsReview', () => {
    const res = normalizeEvent({ ...base, place: ' Зал ', note: 'x', remindBefore: 0, needsReview: 'проверь' })
    expect(res).toMatchObject({ place: 'Зал', note: 'x', remindBefore: 0, needsReview: 'проверь' })
  })

  it('accepts one-off events', () => {
    expect(normalizeEvent({ ...base, day: undefined, date: '2024-03-05' }).date).toBe('2024-03-05')
  })

  it.each<[string, Partial<ScheduleEvent>, string, string]>([
    ['empty title', { title: '  ' }, 'title', 'Введите название'],
    ['bad start', { start: 'abc' }, 'start', 'Не понимаю время «abc»'],
    ['impossible start', { start: '25.70' }, 'start', 'Время 25:70 не существует'],
    ['bad end', { end: '99' }, 'end', 'Время 99:00 не существует'],
    ['end before start', { end: '08:00' }, 'end', 'Окончание раньше начала'],
    ['end equals start', { end: '08:30' }, 'end', 'Окончание раньше начала'],
    ['no participants', { participantIds: [] }, 'participants', 'Выберите хотя бы одного участника'],
    ['no day and no date', { day: undefined }, 'day', 'Укажите день недели или дату'],
    ['bad date', { day: undefined, date: '5.3.2024' }, 'date', 'Дата указана неверно'],
  ])('throws on %s', (_name, patch, field, message) => {
    const run = () => normalizeEvent({ ...base, ...patch })
    expect(run).toThrow(expect.objectContaining({ name: 'ValidationError', field, message }))
  })
})
