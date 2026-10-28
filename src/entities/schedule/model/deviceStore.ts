import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { DEVICE_STORAGE_KEY } from '../config'
import { verifyAdminPin, verifyParticipantPin } from '../lib'

import { useScheduleStore } from './scheduleStore'
import { useSyncStore } from './syncStore'

import type { DeviceConfig, DeviceRole } from './types'

const ROLES: DeviceRole[] = ['admin', 'guest', 'participant']

export function parseDevice(raw: unknown): DeviceConfig {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof DeviceConfig, unknown>>
  const role = ROLES.find((x) => x === r.role) ?? 'admin'
  return {
    role,
    householdId: typeof r.householdId === 'string' && r.householdId ? r.householdId : null,
    participantId: role === 'participant' && typeof r.participantId === 'string' && r.participantId ? r.participantId : null,
  }
}

function loadDevice(): DeviceConfig {
  try {
    return parseDevice(JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) ?? 'null'))
  } catch {
    return parseDevice(null)
  }
}

/** Per-device settings; never synced. */
export const useDeviceStore = defineStore('device', () => {
  const initial = loadDevice()
  const role = ref<DeviceRole>(initial.role)
  const householdId = ref<string | null>(initial.householdId)
  const participantId = ref<string | null>(initial.participantId)

  /** participant role without a participant: the login screen is due */
  const needsLogin = computed(() => role.value === 'participant' && participantId.value === null)

  watch([role, householdId, participantId], () => {
    try {
      localStorage.setItem(
        DEVICE_STORAGE_KEY,
        JSON.stringify({
          role: role.value,
          householdId: householdId.value,
          participantId: participantId.value,
        } satisfies DeviceConfig),
      )
    } catch {
      // Storage may be unavailable; the choice then lasts until reload.
    }
  })

  function setRole(next: DeviceRole) {
    role.value = next
    if (next !== 'participant') participantId.value = null
  }

  function setHousehold(id: string | null) {
    householdId.value = id
  }

  /** Resolves false for an unknown participant or a wrong PIN. */
  async function loginParticipant(pid: string, pin: string): Promise<boolean> {
    const sync = useSyncStore()
    const known = householdId.value ? sync.remoteParticipants : useScheduleStore().participants
    const person = known.find((p) => p.id === pid)
    if (!person || !(await verifyParticipantPin(pin, pid, householdId.value, person.pinHash))) return false
    role.value = 'participant'
    participantId.value = pid
    return true
  }

  async function loginAdmin(pin: string): Promise<boolean> {
    const sync = useSyncStore()
    const hash = householdId.value
      ? (sync.remoteSchedule?.settings.adminPinHash ?? null)
      : useScheduleStore().settings.adminPinHash
    if (hash === null && householdId.value) return false
    if (!(await verifyAdminPin(pin, hash))) return false
    role.value = 'admin'
    participantId.value = null
    return true
  }

  function logout() {
    role.value = 'participant'
    participantId.value = null
  }

  return { role, householdId, participantId, needsLogin, setRole, setHousehold, loginParticipant, loginAdmin, logout }
})
