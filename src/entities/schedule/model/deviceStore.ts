import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

import { DEVICE_STORAGE_KEY } from '../config'

import type { DeviceConfig, DeviceRole } from './types'

function loadDevice(): DeviceConfig {
  try {
    const raw = JSON.parse(localStorage.getItem(DEVICE_STORAGE_KEY) ?? 'null') as Partial<DeviceConfig> | null
    return {
      role: raw?.role === 'guest' ? 'guest' : 'admin',
      householdId: typeof raw?.householdId === 'string' && raw.householdId ? raw.householdId : null,
    }
  } catch {
    return { role: 'admin', householdId: null }
  }
}

/** Per-device settings; never synced. */
export const useDeviceStore = defineStore('device', () => {
  const initial = loadDevice()
  const role = ref<DeviceRole>(initial.role)
  const householdId = ref<string | null>(initial.householdId)

  watch([role, householdId], () => {
    try {
      localStorage.setItem(
        DEVICE_STORAGE_KEY,
        JSON.stringify({ role: role.value, householdId: householdId.value } satisfies DeviceConfig),
      )
    } catch {
      // Storage may be unavailable; the choice then lasts until reload.
    }
  })

  function setRole(next: DeviceRole) {
    role.value = next
  }

  function setHousehold(id: string | null) {
    householdId.value = id
  }

  return { role, householdId, setRole, setHousehold }
})
