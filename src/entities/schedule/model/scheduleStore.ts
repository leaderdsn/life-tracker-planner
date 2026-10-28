import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { env } from '@/shared/config'
import { parseIsoDate } from '@/shared/lib'

import { createSeedSnapshot, DEFAULT_SETTINGS, GUEST_CACHE_KEY, PUSH_DELAY_MS, SCHEMA_VERSION, STORAGE_KEY, UNDO_TIMEOUT_MS } from '../config'
import { effectiveCompletionFor, findConflicts, load, normalizeEvent, occurrences, parseShared, parseSnapshot, save, toShared } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useSyncStore } from './syncStore'

import type {
  Completion,
  IsoDate,
  Participant,
  ScheduleEvent,
  ScheduleSnapshot,
  Settings,
  SharedSchedule,
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

function loadGuestCache(): SharedSchedule | null {
  try {
    return parseShared(JSON.parse(localStorage.getItem(GUEST_CACHE_KEY) ?? 'null'))
  } catch {
    return null
  }
}

function saveGuestCache(schedule: SharedSchedule) {
  try {
    localStorage.setItem(GUEST_CACHE_KEY, JSON.stringify(schedule))
  } catch {
    // The cache only helps offline boots.
  }
}

const emptySnapshot = (): ScheduleSnapshot => ({
  version: SCHEMA_VERSION,
  participants: [],
  events: [],
  completions: [],
  settings: { ...DEFAULT_SETTINGS },
})

const fromShared = (shared: SharedSchedule): ScheduleSnapshot => ({ ...shared, completions: [] })

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const useScheduleStore = defineStore('schedule', () => {
  const device = useDeviceStore()
  const sync = useSyncStore()
  const isGuest = computed(() => device.role === 'guest')

  const initialGuest = () => {
    // Same-device guest: no remote copy yet, fall back to the admin's local data (read-only).
    const cached = loadGuestCache()
    if (cached) return fromShared(cached)
    const local = load()
    return local ? fromShared(toShared(local)) : emptySnapshot()
  }
  const initial = isGuest.value ? initialGuest() : (load() ?? createSeedSnapshot())
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
  let pushTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    [participants, events, completions, settings],
    () => {
      if (isGuest.value) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => save(clone(snapshot())), SAVE_DELAY_MS)
    },
    { deep: true },
  )

  function pushNow() {
    if (!isGuest.value) void sync.pushSchedule(clone(toShared(snapshot())))
  }

  // Admin publishes changes (last write wins); everything except completions is shared.
  watch(
    [participants, events, settings],
    () => {
      if (isGuest.value) return
      clearTimeout(pushTimer)
      pushTimer = setTimeout(pushNow, PUSH_DELAY_MS)
    },
    { deep: true },
  )
  watch(
    () => sync.status,
    (status) => status === 'online' && pushNow(),
  )
  watch(() => sync.connectCount, pushNow)

  // Guest mirrors the remote copy and keeps the last one for offline boots.
  watch(
    () => sync.remoteSchedule,
    (remote) => {
      if (!isGuest.value || !remote) return
      participants.value = remote.participants
      events.value = remote.events
      settings.value = remote.settings
      saveGuestCache(clone(remote))
    },
    { immediate: true },
  )

  // Switching role on this device swaps the data set.
  watch(isGuest, (guest) => {
    clearTimeout(saveTimer)
    clearTimeout(pushTimer)
    restore(guest ? initialGuest() : (load() ?? createSeedSnapshot()))
    if (guest && sync.remoteSchedule) {
      const { remoteSchedule: remote } = sync
      participants.value = remote.participants
      events.value = remote.events
      settings.value = remote.settings
    }
  })

  // Without Firebase an admin tab in the same browser is the only source; follow its saves.
  if (!env.firebase && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || !isGuest.value) return
      const local = load()
      if (!local) return
      participants.value = local.participants
      events.value = local.events
      settings.value = local.settings
    })
  }

  function assertEditable() {
    if (isGuest.value) throw new Error('На гостевом экране расписание нельзя менять')
  }

  if (device.householdId) sync.start()

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
    assertEditable()
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
    assertEditable()
    const p = participants.value.find((x) => x.id === id)
    if (!p) return
    if (patch.name !== undefined && !patch.name.trim()) throw new Error('Введите имя')
    Object.assign(p, patch, patch.name !== undefined ? { name: patch.name.trim() } : {})
  }

  function removeParticipant(id: string) {
    assertEditable()
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
    assertEditable()
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
    assertEditable()
    const index = events.value.findIndex((e) => e.id === id)
    const current = events.value[index]
    if (!current) return
    events.value[index] = normalizeEvent({ ...current, ...patch, id, needsReview: undefined })
  }

  function confirmEvent(id: string) {
    assertEditable()
    const e = events.value.find((x) => x.id === id)
    if (e) delete e.needsReview
  }

  function removeEvent(id: string) {
    assertEditable()
    rememberForUndo()
    events.value = events.value.filter((e) => e.id !== id)
    completions.value = completions.value.filter((c) => c.eventId !== id)
  }

  function completionFor(eventId: string, date: IsoDate): Completion | undefined {
    return completions.value.find((c) => c.eventId === eventId && c.date === date)
  }

  /** Cycle: auto -> skipped, skipped -> cleared, none -> done, done -> none. */
  function toggleCompletion(eventId: string, date: IsoDate, participantId?: string) {
    assertEditable()
    const event = events.value.find((e) => e.id === eventId)
    const pid = participantId ?? event?.participantIds[0]
    const day = parseIsoDate(date)
    const dayOccs = occurrences(events.value, day, day)
    const occ = dayOccs.find((o) => o.event.id === eventId)
    const state =
      occ && pid
        ? effectiveCompletionFor(occ, pid, dayOccs, completions.value, settings.value.autoComplete, Date.now())
        : completionFor(eventId, date)?.status ?? null
    completions.value = completions.value.filter((c) => !(c.eventId === eventId && c.date === date))
    if (state === 'auto') completions.value.push({ eventId, date, status: 'skipped' })
    else if (state === null) completions.value.push({ eventId, date, status: 'done' })
  }

  function updateSettings(patch: Partial<Settings>) {
    assertEditable()
    settings.value = { ...settings.value, ...patch }
  }

  function exportJson(): string {
    return JSON.stringify(snapshot(), null, 2)
  }

  function importJson(text: string) {
    assertEditable()
    const data = parseSnapshot(text)
    rememberForUndo()
    restore(data)
  }

  function resetToSeed() {
    assertEditable()
    rememberForUndo()
    restore(createSeedSnapshot())
  }

  return {
    isGuest,
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
