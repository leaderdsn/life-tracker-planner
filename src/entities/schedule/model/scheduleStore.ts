import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { createSeedSnapshot, SCHEMA_VERSION, UNDO_TIMEOUT_MS } from '../config'
import { findConflicts, load, normalizeEvent, parseSnapshot, save } from '../lib'

import type {
  Completion,
  IsoDate,
  Participant,
  ScheduleEvent,
  ScheduleSnapshot,
  Settings,
} from './types'

type NewEvent = Omit<ScheduleEvent, 'id'>

const SAVE_DELAY_MS = 300

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(name: string): string {
  const slug = [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'p'
}

function uniqueId(base: string, taken: Set<string>): string {
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

function randomId(taken: Set<string>): string {
  let id: string
  do id = `e${Math.random().toString(36).slice(2, 9)}`
  while (taken.has(id))
  return id
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const useScheduleStore = defineStore('schedule', () => {
  const initial = load() ?? createSeedSnapshot()
  const participants = ref<Participant[]>(initial.participants)
  const events = ref<ScheduleEvent[]>(initial.events)
  const completions = ref<Completion[]>(initial.completions)
  const settings = ref<Settings>(initial.settings)

  const sortedParticipants = computed(() => [...participants.value].sort((a, b) => a.order - b.order))
  const participantById = computed(() => (id: string) => participants.value.find((p) => p.id === id))
  const eventsOf = computed(
    () => (id: string) =>
      id === 'all' ? events.value : events.value.filter((e) => e.participantIds.includes(id)),
  )
  const titles = computed(() =>
    [...new Set(events.value.map((e) => e.title))].sort((a, b) => a.localeCompare(b, 'ru')),
  )
  const conflictIds = computed(() => new Set(findConflicts(events.value).flatMap((c) => c.eventIds)))

  function snapshot(): ScheduleSnapshot {
    return {
      version: SCHEMA_VERSION,
      participants: participants.value,
      events: events.value,
      completions: completions.value,
      settings: settings.value,
    }
  }

  let saveTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    [participants, events, completions, settings],
    () => {
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => save(clone(snapshot())), SAVE_DELAY_MS)
    },
    { deep: true },
  )

  const undoSnapshot = ref<ScheduleSnapshot | null>(null)
  const canUndo = computed(() => undoSnapshot.value !== null)
  let undoTimer: ReturnType<typeof setTimeout> | undefined

  function rememberForUndo() {
    undoSnapshot.value = clone(snapshot())
    clearTimeout(undoTimer)
    undoTimer = setTimeout(() => (undoSnapshot.value = null), UNDO_TIMEOUT_MS)
  }

  function restore(data: ScheduleSnapshot) {
    participants.value = data.participants
    events.value = data.events
    completions.value = data.completions
    settings.value = data.settings
  }

  function undo(): boolean {
    if (!undoSnapshot.value) return false
    restore(undoSnapshot.value)
    undoSnapshot.value = null
    clearTimeout(undoTimer)
    return true
  }

  function addParticipant({ name, color }: { name: string; color: string }): Participant {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Введите имя')
    const participant: Participant = {
      id: uniqueId(slugify(trimmed), new Set(participants.value.map((p) => p.id))),
      name: trimmed,
      color,
      order: participants.value.reduce((max, p) => Math.max(max, p.order), -1) + 1,
    }
    participants.value.push(participant)
    return participant
  }

  function updateParticipant(id: string, patch: Partial<Omit<Participant, 'id'>>) {
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    if (patch.name !== undefined && !patch.name.trim()) throw new Error('Введите имя')
    Object.assign(p, patch, patch.name !== undefined ? { name: patch.name.trim() } : {})
  }

  function removeParticipant(id: string) {
    rememberForUndo()
    participants.value = participants.value.filter((p) => p.id !== id)
    const gone = new Set<string>()
    events.value = events.value.flatMap((e) => {
      if (!e.participantIds.includes(id)) return [e]
      const rest = e.participantIds.filter((x) => x !== id)
      if (!rest.length) {
        gone.add(e.id)
        return []
      }
      return [{ ...e, participantIds: rest }]
    })
    completions.value = completions.value.filter((c) => !gone.has(c.eventId))
  }

  function addEvents(list: NewEvent[]): ScheduleEvent[] {
    const taken = new Set(events.value.map((e) => e.id))
    const created = list.map((e) => {
      const id = randomId(taken)
      taken.add(id)
      return normalizeEvent({ ...e, id })
    })
    events.value.push(...created)
    return created
  }

  function addEvent(event: NewEvent): ScheduleEvent {
    return addEvents([event])[0] as ScheduleEvent
  }

  function updateEvent(id: string, patch: Partial<Omit<ScheduleEvent, 'id'>>) {
    const index = events.value.findIndex((e) => e.id === id)
    const current = events.value[index]
    if (!current) return
    events.value[index] = normalizeEvent({ ...current, ...patch, id, needsReview: undefined })
  }

  function confirmEvent(id: string) {
    const e = events.value.find((x) => x.id === id)
    if (e) delete e.needsReview
  }

  function removeEvent(id: string) {
    rememberForUndo()
    events.value = events.value.filter((e) => e.id !== id)
    completions.value = completions.value.filter((c) => c.eventId !== id)
  }

  function completionFor(eventId: string, date: IsoDate): Completion | undefined {
    return completions.value.find((c) => c.eventId === eventId && c.date === date)
  }

  function toggleCompletion(eventId: string, date: IsoDate) {
    const wasDone = completionFor(eventId, date)?.status === 'done'
    completions.value = completions.value.filter((c) => !(c.eventId === eventId && c.date === date))
    if (!wasDone) completions.value.push({ eventId, date, status: 'done' })
  }

  function updateSettings(patch: Partial<Settings>) {
    settings.value = { ...settings.value, ...patch }
  }

  function exportJson(): string {
    return JSON.stringify(snapshot(), null, 2)
  }

  function importJson(text: string) {
    const data = parseSnapshot(text)
    rememberForUndo()
    restore(data)
  }

  function resetToSeed() {
    rememberForUndo()
    restore(createSeedSnapshot())
  }

  return {
    participants,
    events,
    completions,
    settings,
    sortedParticipants,
    participantById,
    eventsOf,
    titles,
    conflictIds,
    canUndo,
    addParticipant,
    updateParticipant,
    removeParticipant,
    addEvent,
    addEvents,
    updateEvent,
    confirmEvent,
    removeEvent,
    toggleCompletion,
    completionFor,
    updateSettings,
    undo,
    exportJson,
    importJson,
    resetToSeed,
  }
})
