import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { createTransport, generateHouseholdId, pruneAcks } from '../lib'

import { useDeviceStore } from './deviceStore'

import type { AlarmAck, AlarmKey, DeviceRole, RingingInfo, SharedSchedule, SyncStatus, SyncTransport, Unsubscribe } from './types'

export const useSyncStore = defineStore('sync', () => {
  const device = useDeviceStore()
  const status = ref<SyncStatus>('off')
  const remoteSchedule = ref<SharedSchedule | null>(null)
  const rawRinging = ref<Record<AlarmKey, RingingInfo>>({})
  const acks = ref<Record<AlarmKey, AlarmAck>>({})
  /** bumps after every successful connect() so the admin can publish right away */
  const connectCount = ref(0)

  let transport: SyncTransport | null = null
  let connectedTo: string | null = null
  let unsubs: Unsubscribe[] = []

  /** Alarms that are ringing and not yet acknowledged by anyone. */
  const ringing = computed(() =>
    Object.fromEntries(Object.entries(rawRinging.value).filter(([key]) => !(key in acks.value))),
  )

  const guestLink = computed(() =>
    device.householdId
      ? `${location.origin}${import.meta.env.BASE_URL}#/guest?h=${device.householdId}`
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
    connectCount,
    ringing,
    acks,
    guestLink,
    start,
    stop,
    enableSync,
    pushSchedule,
    setRinging,
    ack,
    silence,
    silenceAll,
  }
})
