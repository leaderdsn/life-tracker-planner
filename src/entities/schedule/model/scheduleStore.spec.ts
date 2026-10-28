import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSeedSnapshot, STORAGE_KEY, UNDO_TIMEOUT_MS } from '../config'
import { buildGrid, ValidationError } from '../lib'

import { useScheduleStore } from './scheduleStore'

import type { ScheduleEvent } from './types'

type NewEvent = Omit<ScheduleEvent, 'id'>

const newEvent = (patch: Partial<NewEvent> = {}): NewEvent => ({
  participantIds: ['ruslan'],
  day: 'mon',
  start: '14:00',
  title: 'Тест',
  category: 'activity',
  ...patch,
})

function makeStore() {
  setActivePinia(createPinia())
  return useScheduleStore()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('initial state', () => {
  it('starts from the seed on first run', () => {
    const store = makeStore()
    expect(store.participants).toHaveLength(4)
    expect(store.events).toHaveLength(createSeedSnapshot().events.length)
    expect(store.sortedParticipants.map((p) => p.id)).toEqual(['ruslan', 'ratmir', 'vasilisa', 'me'])
  })

  it('loads a saved snapshot instead of the seed', () => {
    const snap = createSeedSnapshot()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...snap, events: snap.events.slice(0, 3) }))
    expect(makeStore().events).toHaveLength(3)
  })
})

describe('participants', () => {
  it('creates unique slug ids and increasing order', () => {
    const store = makeStore()
    const a = store.addParticipant({ name: 'Анна', color: '#fff' })
    const b = store.addParticipant({ name: ' Анна ', color: '#fff' })
    expect(a.id).toBe('anna')
    expect(b.id).toBe('anna-2')
    expect(b.order).toBeGreaterThan(a.order)
  })

  it('rejects an empty name', () => {
    expect(() => makeStore().addParticipant({ name: ' ', color: '#fff' })).toThrow('Введите имя')
  })

  it('updates a participant', () => {
    const store = makeStore()
    store.updateParticipant('me', { name: ' Саша ', color: '#000' })
    expect(store.participantById('me')).toMatchObject({ name: 'Саша', color: '#000' })
  })

  describe('removeParticipant', () => {
    function setup() {
      const store = makeStore()
      const solo = store.addEvent(newEvent({ participantIds: ['ratmir'], title: 'Соло' }))
      const shared = store.addEvent(newEvent({ participantIds: ['ratmir', 'me'], title: 'Вместе' }))
      store.toggleCompletion(solo.id, '2024-03-04')
      store.toggleCompletion(shared.id, '2024-03-04')
      const before = store.events.length
      store.removeParticipant('ratmir')
      return { store, solo, shared, before }
    }

    it('strips the participant from shared events', () => {
      const { store, shared } = setup()
      expect(store.events.find((e) => e.id === shared.id)?.participantIds).toEqual(['me'])
      expect(store.participantById('ratmir')).toBeUndefined()
    })

    it('deletes orphaned events and their completions only', () => {
      const { store, solo, shared } = setup()
      expect(store.events.some((e) => e.id === solo.id)).toBe(false)
      expect(store.completions.map((c) => c.eventId)).toEqual([shared.id])
      expect(store.events.some((e) => e.participantIds.includes('ratmir'))).toBe(false)
    })

    it('can be undone', () => {
      const { store, before, solo } = setup()
      expect(store.canUndo).toBe(true)
      expect(store.undo()).toBe(true)
      expect(store.events).toHaveLength(before)
      expect(store.participantById('ratmir')).toBeDefined()
      expect(store.completions.some((c) => c.eventId === solo.id)).toBe(true)
    })
  })
})

describe('events and the derived grid', () => {
  it('removes the 14:00 row when its only event is deleted', () => {
    const store = makeStore()
    const only = store.addEvent(newEvent({ start: '14:07' }))
    expect(buildGrid(store.events).rows.map((r) => r.time)).toContain('14:07')
    store.removeEvent(only.id)
    expect(buildGrid(store.events).rows.map((r) => r.time)).not.toContain('14:07')
  })

  it('makes an added 07:15 event the first row', () => {
    const store = makeStore()
    store.addEvent(newEvent({ start: '7.15' }))
    expect(buildGrid(store.events).rows[0]?.time).toBe('07:15')
  })

  it('validates and normalizes on add, leaving the store untouched on failure', () => {
    const store = makeStore()
    const count = store.events.length
    expect(() => store.addEvent(newEvent({ title: ' ' }))).toThrow(ValidationError)
    expect(() => store.addEvents([newEvent(), newEvent({ end: '01:00' })])).toThrow('Окончание раньше начала')
    expect(store.events).toHaveLength(count)
    const e = store.addEvent(newEvent({ title: 'ПЛАВАНИЕ БАССЕЙН', start: '9:5' }))
    expect(e).toMatchObject({ title: 'Плавание бассейн', start: '09:05' })
    expect(e.id).toBeTruthy()
  })

  it('clears needsReview on edit and on confirm', () => {
    const store = makeStore()
    const [a, b] = store.addEvents([newEvent(), newEvent({ title: 'Другое' })])
    store.events.forEach((e) => {
      if (e.id === a?.id || e.id === b?.id) e.needsReview = 'проверить'
    })
    store.updateEvent(a?.id as string, { title: 'Новое' })
    store.confirmEvent(b?.id as string)
    expect(store.events.find((e) => e.id === a?.id)).toMatchObject({ title: 'Новое' })
    expect(store.events.find((e) => e.id === a?.id)?.needsReview).toBeUndefined()
    expect(store.events.find((e) => e.id === b?.id)?.needsReview).toBeUndefined()
  })

  it('rejects an invalid update without changing the event', () => {
    const store = makeStore()
    const e = store.addEvent(newEvent())
    expect(() => store.updateEvent(e.id, { start: 'abc' })).toThrow('Не понимаю время')
    expect(store.events.find((x) => x.id === e.id)?.start).toBe('14:00')
  })

  it('exposes getters', () => {
    const store = makeStore()
    store.addEvent(newEvent({ title: 'Аааа уникальное' }))
    expect(store.eventsOf('all')).toHaveLength(store.events.length)
    expect(store.eventsOf('me').every((e) => e.participantIds.includes('me'))).toBe(true)
    expect(store.titles).toContain('Аааа уникальное')
    expect(new Set(store.titles).size).toBe(store.titles.length)
  })

  it('reports conflicting events', () => {
    const store = makeStore()
    const a = store.addEvent(newEvent({ participantIds: ['me'], day: 'sun', start: '03:00', end: '04:00' }))
    const b = store.addEvent(newEvent({ participantIds: ['me'], day: 'sun', start: '03:30', end: '04:30' }))
    expect(store.conflictIds.has(a.id) && store.conflictIds.has(b.id)).toBe(true)
  })
})

describe('completions', () => {
  it('toggles none -> done -> none', () => {
    const store = makeStore()
    store.toggleCompletion('e1', '2024-03-04')
    expect(store.completionFor('e1', '2024-03-04')?.status).toBe('done')
    store.toggleCompletion('e1', '2024-03-04')
    expect(store.completionFor('e1', '2024-03-04')).toBeUndefined()
  })
})

describe('undo', () => {
  it('restores a removed event', () => {
    const store = makeStore()
    const count = store.events.length
    store.removeEvent('e1')
    expect(store.events).toHaveLength(count - 1)
    expect(store.undo()).toBe(true)
    expect(store.events).toHaveLength(count)
    expect(store.canUndo).toBe(false)
    expect(store.undo()).toBe(false)
  })

  it('expires after the timeout', () => {
    const store = makeStore()
    store.removeEvent('e1')
    vi.advanceTimersByTime(UNDO_TIMEOUT_MS + 1)
    expect(store.canUndo).toBe(false)
    expect(store.undo()).toBe(false)
  })

  it('covers reset and import', () => {
    const store = makeStore()
    store.addParticipant({ name: 'Новый', color: '#fff' })
    store.resetToSeed()
    expect(store.participants).toHaveLength(4)
    expect(store.undo()).toBe(true)
    expect(store.participants).toHaveLength(5)

    const text = store.exportJson()
    store.removeEvent('e1')
    store.importJson(text)
    expect(store.events.some((e) => e.id === 'e1')).toBe(true)
    expect(store.undo()).toBe(true)
    expect(store.events.some((e) => e.id === 'e1')).toBe(false)
  })

  it('does not change state when the import is invalid', () => {
    const store = makeStore()
    expect(() => store.importJson('nope')).toThrow('это не JSON')
    expect(store.canUndo).toBe(false)
    expect(store.participants).toHaveLength(4)
  })
})

describe('settings and persistence', () => {
  it('updates settings partially', () => {
    const store = makeStore()
    store.updateSettings({ sound: false })
    expect(store.settings).toMatchObject({ sound: false, defaultRemindBefore: 10 })
  })

  it('saves to storage after a 300 ms debounce', async () => {
    const store = makeStore()
    store.updateSettings({ defaultRemindBefore: 30 })
    await nextTick()
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    vi.advanceTimersByTime(300)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string).settings.defaultRemindBefore).toBe(30)
  })
})

describe('toggleCompletion cycle', () => {
  const DATE = '2020-01-06' // a Monday in the past: auto rules apply to everything

  it.each<[string, boolean, string[]]>([
    ['manual mode', false, ['done', 'none', 'done']],
    ['auto mode', true, ['skipped', 'none', 'skipped']],
  ])('%s', (_name, autoComplete, expected) => {
    const store = makeStore()
    store.updateSettings({ autoComplete })
    const id = store.events.find((e) => e.day === 'mon')!.id
    const states = [0, 1, 2].map(() => {
      store.toggleCompletion(id, DATE)
      return store.completionFor(id, DATE)?.status ?? 'none'
    })
    expect(states).toEqual(expected)
  })
})
