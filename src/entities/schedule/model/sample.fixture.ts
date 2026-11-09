import { createEmptySnapshot, STORAGE_KEY } from '../config'

import type { ScheduleEvent, ScheduleSnapshot } from './types'

const event = (id: string, participantIds: string[], day: ScheduleEvent['day'], start: string, title: string): ScheduleEvent => ({
  id,
  participantIds,
  day,
  start,
  end: undefined,
  title,
  category: 'activity',
})

export function createSampleSnapshot(): ScheduleSnapshot {
  return {
    ...createEmptySnapshot(),
    participants: [
      { id: 'misha', name: 'Миша', color: '#bde0fe', order: 0 },
      { id: 'petya', name: 'Петя', color: '#cfe2ff', order: 1 },
      { id: 'katya', name: 'Катя', color: '#ffd6e0', order: 2 },
      { id: 'me', name: 'Аня', color: '#fce8b2', order: 3 },
    ],
    events: [
      event('e1', ['misha'], 'mon', '09:00', 'Рисование'),
      event('e2', ['petya'], 'mon', '10:00', 'Плавание'),
      event('e3', ['katya'], 'tue', '11:00', 'Танцы'),
      event('e4', ['misha', 'petya'], 'wed', '12:00', 'Шахматы'),
      event('e5', ['me'], 'thu', '13:00', 'Работа'),
    ],
  }
}

export function seedLocalSchedule(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(createSampleSnapshot()))
}
