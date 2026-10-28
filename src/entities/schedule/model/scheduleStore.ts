import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { env } from '@/shared/config'
import { parseIsoDate } from '@/shared/lib'

import { createSeedSnapshot, DEFAULT_SETTINGS, GUEST_CACHE_KEY, PUSH_DELAY_MS, SCHEMA_VERSION, STORAGE_KEY, UNDO_TIMEOUT_MS } from '../config'
import {
  canEdit,
  canToggle,
  completionKey,
  effectiveCompletionFor,
  findConflicts,
  hashParticipantPin,
  load,
  mergeCompletions,
  mergeProfiles,
  normalizeEvent,
  occurrences,
  parseShared,
  parseSnapshot,
  progress,
  save,
  toProfile,
  toShared,
} from '../lib'
import type { CompletionSyncState } from '../lib'

import { useDeviceStore } from './deviceStore'
import { useSyncStore } from './syncStore'

import type {
  Completion,
  IsoDate,
  Participant,
  ParticipantProfile,
  ProgressCounter,
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

type RemoteCache = { schedule: SharedSchedule; profiles: Record<string, ParticipantProfile> }

function loadRemoteCache(): RemoteCache | null {
  try {
    const raw = JSON.parse(localStorage.getItem(GUEST_CACHE_KEY) ?? 'null') as { profiles?: unknown } | null
    const schedule = parseShared(raw)
    if (!schedule) return null
    const profiles = typeof raw?.profiles === 'object' && raw.profiles !== null ? raw.profiles : {}
    return { schedule, profiles: profiles as Record<string, ParticipantProfile> }
  } catch {
    return null
  }
}

function saveRemoteCache(cache: RemoteCache) {
  try {
    localStorage.setItem(GUEST_CACHE_KEY, JSON.stringify({ ...cache.schedule, profiles: cache.profiles }))
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

const NO_PROGRESS: ProgressCounter = { done: 0, total: 0 }

export const useScheduleStore = defineStore('schedule', () => {
  const device = useDeviceStore()
  const sync = useSyncStore()
  const isGuest = computed(() => device.role === 'guest')
  const isParticipant = computed(() => device.role === 'participant')
  const isAdmin = computed(() => device.role === 'admin')
  /** guest and participant devices mirror the shared copy instead of owning data */
  const isRemote = computed(() => !isAdmin.value)

  const initialRemote = (): ScheduleSnapshot => {
    // Same-device guest: no remote copy yet, fall back to the admin's local data (read-only).
    const cached = loadRemoteCache()
    if (cached) {
      const data = fromShared(cached.schedule)
      return { ...data, participants: mergeProfiles(data.participants, cached.profiles) }
    }
    const local = load()
    return local ? { ...local, completions: [] } : emptySnapshot()
  }
  const initial = isRemote.value ? initialRemote() : (load() ?? createSeedSnapshot())
  const participants = ref<Participant[]>(initial.participants)
  const events = ref<ScheduleEvent[]>(initial.events)
  const completions = ref<Completion[]>(initial.completions)
  const settings = ref<Settings>(initial.settings)

  const ownParticipant = computed(() =>
    isParticipant.value ? participants.value.find((p) => p.id === device.participantId) : undefined,
  )
  const ownEvents = computed(() => {
    const id = device.participantId
    return isParticipant.value && id ? events.value.filter((e) => e.participantIds.includes(id)) : []
  })

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
      if (!isAdmin.value) return
      clearTimeout(saveTimer)
      saveTimer = setTimeout(() => save(clone(snapshot())), SAVE_DELAY_MS)
    },
    { deep: true },
  )

  function pushNow() {
    if (isAdmin.value) void sync.pushSchedule(clone(toShared(snapshot())))
  }

  // Admin publishes changes (last write wins); profiles and completions travel separately.
  watch(
    [participants, events, settings],
    () => {
      if (!isAdmin.value) return
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

  // Guest and participant mirror the remote copy and keep the last one for offline boots.
  const cachedProfiles = loadRemoteCache()?.profiles ?? {}

  function applyRemote() {
    const profiles = { ...cachedProfiles, ...sync.remoteProfiles }
    const remote = sync.remoteSchedule
    if (remote) {
      participants.value = mergeProfiles(remote.participants, profiles)
      events.value = remote.events
      settings.value = remote.settings
      saveRemoteCache({ schedule: clone(remote), profiles: clone(profiles) })
    } else {
      participants.value = mergeProfiles(participants.value, profiles)
    }
  }

  watch(
    [() => sync.remoteSchedule, () => sync.remoteProfiles],
    () => {
      if (isRemote.value) applyRemote()
    },
    { immediate: true },
  )

  // Admin takes profile changes made by participants; local ones are published once connected.
  let seedProfiles = false
  watch(
    () => sync.remoteProfiles,
    (remote) => {
      if (!isAdmin.value) return
      participants.value = mergeProfiles(participants.value, remote)
      if (!seedProfiles) return
      seedProfiles = false
      for (const p of participants.value) {
        const profile = toProfile(p)
        if (!(p.id in remote) && Object.keys(profile).length) void sync.pushProfile(p.id, profile)
      }
    },
  )

  // Completions: per-key last write wins on every device; the local copy is kept.
  const syncState: CompletionSyncState = { stamps: {}, known: new Set() }
  let seedCompletions = false
  watch(
    () => sync.remoteCompletions,
    (remote) => {
      completions.value = mergeCompletions(completions.value, remote, syncState)
      syncState.known = new Set(Object.keys(remote))
      if (!seedCompletions || !isAdmin.value) return
      seedCompletions = false
      for (const c of completions.value) {
        const key = completionKey(c.eventId, c.date)
        if (!(key in remote)) void sync.setCompletion(key, { status: c.status, by: 'admin', at: Date.now() })
      }
    },
  )
  watch(
    () => sync.connectCount,
    () => {
      seedProfiles = true
      seedCompletions = true
      syncState.known = new Set()
    },
  )

  /** Applies a local change to the marks and publishes the difference. */
  function commitCompletions(next: Completion[]) {
    const before = new Map(completions.value.map((c) => [completionKey(c.eventId, c.date), c]))
    const after = new Map(next.map((c) => [completionKey(c.eventId, c.date), c]))
    const at = Date.now()
    for (const [key, c] of after) {
      if (before.get(key)?.status === c.status) continue
      syncState.stamps[key] = at
      void sync.setCompletion(key, { status: c.status, by: device.role, at })
    }
    for (const key of before.keys()) {
      if (after.has(key)) continue
      syncState.stamps[key] = at
      void sync.setCompletion(key, null)
    }
    completions.value = next
  }

  // Switching role on this device swaps the data set.
  watch(isRemote, (remote) => {
    clearTimeout(saveTimer)
    clearTimeout(pushTimer)
    if (remote) {
      restore(initialRemote())
      applyRemote()
    } else if (!device.householdId || !participants.value.length) {
      restore(load() ?? createSeedSnapshot())
    }
  })

  // Without Firebase an admin tab in the same browser is the only source; follow its saves.
  if (!env.firebase && typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== STORAGE_KEY || !isRemote.value) return
      const local = load()
      if (!local) return
      participants.value = local.participants
      events.value = local.events
      settings.value = local.settings
    })
  }

  function assertEditable() {
    if (canEdit(device.role)) return
    throw new Error(
      isGuest.value ? 'На гостевом экране расписание нельзя менять' : 'Расписание может менять только администратор',
    )
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
    if (isAdmin.value) commitCompletions(data.completions)
    else completions.value = data.completions
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
    if ('avatar' in patch || 'alarmSound' in patch) void sync.pushProfile(id, toProfile(p))
  }

  /** Sets or clears a participant's PIN, salted with the household and participant. */
  function setParticipantPin(id: string, pin: string | null): Promise<void> {
    assertEditable()
    const household = device.householdId
    return (pin ? hashParticipantPin(pin, id, household) : Promise.resolve(null)).then((pinHash) =>
      updateParticipant(id, { pinHash }),
    )
  }

  function updateProfile(id: string, patch: ParticipantProfile) {
    if (!isAdmin.value && !(isParticipant.value && device.participantId === id)) {
      throw new Error('Можно менять только свой профиль')
    }
    const i = participants.value.findIndex((x) => x.id === id)
    const current = participants.value[i]
    if (!current) return
    const next: Participant = { ...current }
    if ('avatar' in patch) {
      if (patch.avatar) next.avatar = patch.avatar
      else delete next.avatar
    }
    if ('alarmSound' in patch) {
      if (patch.alarmSound) next.alarmSound = patch.alarmSound
      else delete next.alarmSound
    }
    participants.value[i] = next
    void sync.pushProfile(id, toProfile(next))
  }

  /** Same permissions as updateProfile: a participant device may only touch its own participant. */
  const updateOwnProfile = updateProfile

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
    commitCompletions(completions.value.filter((c) => !gone.has(c.eventId)))
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
    commitCompletions(completions.value.filter((c) => c.eventId !== id))
  }

  function completionFor(eventId: string, date: IsoDate): Completion | undefined {
    return completions.value.find((c) => c.eventId === eventId && c.date === date)
  }

  /** Cycle: auto -> skipped, skipped -> cleared, none -> done, done -> none. A participant may only mark own events. */
  function toggleCompletion(eventId: string, date: IsoDate, participantId?: string) {
    const event = events.value.find((e) => e.id === eventId)
    if (!isAdmin.value) {
      const own = device.participantId
      if (!canToggle(device.role, own, event) || (participantId !== undefined && participantId !== own)) {
        throw new Error(
          isGuest.value ? 'На гостевом экране расписание нельзя менять' : 'Можно отмечать только свои занятия',
        )
      }
    }
    const pid = participantId ?? (isParticipant.value ? (device.participantId ?? undefined) : event?.participantIds[0])
    const day = parseIsoDate(date)
    const dayOccs = occurrences(events.value, day, day)
    const occ = dayOccs.find((o) => o.event.id === eventId)
    const state =
      occ && pid
        ? effectiveCompletionFor(occ, pid, dayOccs, completions.value, settings.value.autoComplete, Date.now())
        : completionFor(eventId, date)?.status ?? null
    const next = completions.value.filter((c) => !(c.eventId === eventId && c.date === date))
    if (state === 'auto') next.push({ eventId, date, status: 'skipped' })
    else if (state === null) next.push({ eventId, date, status: 'done' })
    commitCompletions(next)
  }

  function ownOccurrences(from: Date, to: Date) {
    return occurrences(ownEvents.value, from, to)
  }

  function ownProgress(from: Date, to: Date, now = Date.now()): ProgressCounter {
    const id = device.participantId
    if (!id) return NO_PROGRESS
    const options = { autoComplete: settings.value.autoComplete, now }
    return progress(completions.value, ownOccurrences(from, to), [id], options)[id] ?? NO_PROGRESS
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
    isParticipant,
    isAdmin,
    ownParticipant,
    ownEvents,
    ownOccurrences,
    ownProgress,
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
    setParticipantPin,
    updateProfile,
    updateOwnProfile,
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
