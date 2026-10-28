import { beforeEach, describe, expect, it } from 'vitest'

import { createSeedSnapshot, STORAGE_KEY } from '../config'

import { load, migrate, parseSnapshot, save } from './persistence'

const valid = () => ({
  version: 1,
  participants: [{ id: 'a', name: 'Аня', color: '#CFE2FF' }],
  events: [{ id: 'e1', participantIds: ['a'], day: 'mon', start: '8.30', title: 'вокал', category: 'activity' }],
})

describe('parseSnapshot', () => {
  it('normalizes events and fills defaults', () => {
    const res = parseSnapshot(JSON.stringify(valid()))
    expect(res.events[0]).toMatchObject({ start: '08:30', title: 'Вокал' })
    expect(res.participants[0]?.order).toBe(0)
    expect(res.completions).toEqual([])
    expect(res.settings.defaultRemindBefore).toBe(10)
  })

  it.each<[string, string, string]>([
    ['not json', '{oops', 'Не удалось прочитать файл: это не JSON'],
    ['not an object', '[]', 'Файл не похож на расписание'],
    ['missing version', '{}', 'В файле не указана версия данных'],
    ['future version', JSON.stringify({ ...valid(), version: 99 }), 'Файл создан в более новой версии приложения'],
    ['no participants', JSON.stringify({ ...valid(), participants: undefined }), 'В файле нет списка участников'],
    ['no events', JSON.stringify({ ...valid(), events: 5 }), 'В файле нет списка событий'],
    [
      'bad event',
      JSON.stringify({ ...valid(), events: [{ ...valid().events[0], start: 'abc' }] }),
      'Событие «вокал»: Не понимаю время «abc»',
    ],
    [
      'unknown participant',
      JSON.stringify({ ...valid(), events: [{ ...valid().events[0], participantIds: ['zzz'] }] }),
      'Событие «вокал»: указан неизвестный участник',
    ],
  ])('rejects %s', (_name, text, message) => {
    expect(() => parseSnapshot(text)).toThrow(message)
  })
})

describe('migrate', () => {
  it('keeps the seed snapshot intact', () => {
    const seed = createSeedSnapshot()
    const res = migrate(JSON.parse(JSON.stringify(seed)))
    expect(res.events).toHaveLength(seed.events.length)
    expect(res.participants).toEqual(seed.participants)
  })
})

describe('load / save', () => {
  beforeEach(() => localStorage.clear())

  it('returns null for empty or corrupted storage', () => {
    expect(load()).toBeNull()
    localStorage.setItem(STORAGE_KEY, 'garbage')
    expect(load()).toBeNull()
  })

  it('round-trips a snapshot', () => {
    const snap = migrate(valid())
    save(snap)
    expect(load()).toEqual(snap)
  })
})
