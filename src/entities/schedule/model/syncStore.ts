import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { env } from '@/shared/config'

import { createTransport, generateHouseholdId, mergeProfiles, pruneAcks } from '../lib'

import { useDeviceStore } from './deviceStore'

import type {
  AlarmAck,
  AlarmKey,
  DeviceRole,
  Participant,
  ParticipantProfile,
  RingingInfo,
  SharedSchedule,
  SyncedCompletion,
  SyncStatus,
  SyncTransport,
  Unsubscribe,
} from './types'

/** Links opened on other devices must not point to a local dev server. */
function appBaseUrl(): string {
  const local = /^(localhost|127.0.0.1|[::1])$/.test(location.hostname)
  if (local && env.publicUrl) return env.publicUrl.endsWith('/') ? env.publicUrl : `${env.publicUrl}/`
  return `${location.origin}${import.meta.env.BASE_URL}`
}

export const useSyncStore = defineStore('sync', () => {
  const device = useDeviceStore()
  const status = ref<SyncStatus>('off')
  const remoteSchedule = ref<SharedSchedule | null>(null)
  const remoteProfiles = ref<Record<string, ParticipantProfile>>({})
  const remoteCompletions = ref<Record<string, SyncedCompletion>>({})
  const rawRinging = ref<Record<AlarmKey, RingingInfo>>({})
  const acks = ref<Record<AlarmKey, AlarmAck>>({})
  /** bumps after every successful connect() so the admin can publish right away */
  const connectCount = ref(0)

  let transport: SyncTransport | null = null
  let connectedTo: string | null = null
  let unsubs: Unsubscribe[] = []

  /** Remote participants with their profiles applied; what a device without local data picks from at login. */
  const remoteParticipants = computed<Participant[]>(() =>
    remoteSchedule.value ? mergeProfiles(remoteSchedule.value.participants, remoteProfiles.value) : [],
  )

  /** Alarms that are ringing and not yet acknowledged by anyone. */
  const ringing = computed(() =>
    Object.fromEntries(Object.entries(rawRinging.value).filter(([key]) => !(key in acks.value))),
  )

  const guestLink = computed(() =>
    device.householdId
      ? `${appBaseUrl()}#/guest?h=${device.householdId}`
      : '',
  )

  function start() {
    const id = device.householdId
    if (!id || (transport && connectedTo === id)) return
    stop()
    const t = createTransport()
    transport = t
    connectedTo = id
    unsubs = [
      t.onStatus((s) => (status.value = s)),
      t.onSchedule((s) => (remoteSchedule.value = s)),
      t.onProfiles((p) => (remoteProfiles.value = p)),
      t.onCompletions((c) => (remoteCompletions.value = c)),
      t.onRinging((r) => (rawRinging.value = r)),
      t.onAcks((a) => (acks.value = pruneAcks(a, Date.now()))),
    ]
    void t.connect(id).then(() => {
      if (transport === t) connectCount.value++
    })
  }

  function stop() {
    unsubs.forEach((u) => u())
    unsubs = []
    transport?.disconnect()
    transport = null
    connectedTo = null
    status.value = 'off'
  }

  /** Creates the household on first use and connects; returns its id. */
  function enableSync(): string {
    const id = device.householdId ?? generateHouseholdId()
    device.setHousehold(id)
    start()
    return id
  }

  function pushSchedule(schedule: SharedSchedule) {
    return transport?.pushSchedule(schedule).catch(() => undefined)
  }

  function pushProfile(participantId: string, profile: ParticipantProfile) {
    if (!transport) return
    remoteProfiles.value = { ...remoteProfiles.value, [participantId]: profile }
    return transport.pushProfile(participantId, profile).catch(() => undefined)
  }

  function setCompletion(key: string, value: SyncedCompletion | null) {
    if (!transport) return
    const next = { ...remoteCompletions.value }
    if (value) next[key] = value
    else delete next[key]
    remoteCompletions.value = next
    return transport.setCompletion(key, value).catch(() => undefined)
  }

  function setRinging(key: AlarmKey, info: RingingInfo | null) {
    if (!info && !(key in rawRinging.value)) return
    const next = { ...rawRinging.value }
    if (info) next[key] = info
    else delete next[key]
    rawRinging.value = next
    return transport?.setRinging(key, info).catch(() => undefined)
  }

  function ack(key: AlarmKey, by: DeviceRole) {
    // applied locally first so the screen reacts without waiting for the network
    acks.value = { ...acks.value, [key]: { by, at: Date.now() } }
    return transport?.ack(key, by).catch(() => undefined)
  }

  const silence = (key: AlarmKey) => ack(key, 'admin')

  function silenceAll() {
    Object.keys(ringing.value).forEach((key) => void silence(key))
  }

  return {
    status,
    remoteSchedule,
    remoteProfiles,
    remoteCompletions,
    remoteParticipants,
    connectCount,
    ringing,
    acks,
    guestLink,
    start,
    stop,
    enableSync,
    pushSchedule,
    pushProfile,
    setCompletion,
    setRinging,
    ack,
    silence,
    silenceAll,
  }
})
