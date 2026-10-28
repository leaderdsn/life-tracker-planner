<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import { useDeviceStore, useScheduleStore, verifyPin } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import { useLongPress } from '../model/useLongPress'
import PinKeypad from './PinKeypad.vue'

const HOLD_MS = 3000

const router = useRouter()
const device = useDeviceStore()
const store = useScheduleStore()

const dialogOpen = ref(false)
const error = ref('')
const busy = ref(false)
const keypad = ref<{ clear: () => void } | null>(null)

function leave() {
  dialogOpen.value = false
  device.setRole('admin')
  void router.replace({ name: ROUTE_NAMES.all })
}

const { holding, start, cancel } = useLongPress(() => {
  const hash = store.settings.adminPinHash
  if (!hash) return leave()
  error.value = ''
  dialogOpen.value = true
}, HOLD_MS)

async function submit(pin: string) {
  const hash = store.settings.adminPinHash
  if (!hash) return leave()
  busy.value = true
  try {
    if (await verifyPin(pin, hash)) return leave()
    error.value = 'Неверный PIN'
    keypad.value?.clear()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <button
    type="button"
    class="guest-exit"
    :class="{ 'is-holding': holding }"
    :style="{ '--hold-ms': `${HOLD_MS}ms` }"
    aria-label="Выход из гостевого режима: удерживайте 3 секунды"
    @pointerdown="start"
    @pointerup="cancel"
    @pointerleave="cancel"
    @pointercancel="cancel"
    @contextmenu.prevent
  >
    <svg class="guest-exit__ring" viewBox="0 0 56 56" aria-hidden="true">
      <circle class="guest-exit__track" cx="28" cy="28" r="24" />
      <circle class="guest-exit__progress" cx="28" cy="28" r="24" />
    </svg>
    <i class="pi pi-lock guest-exit__icon" aria-hidden="true" />
  </button>

  <Dialog
    v-model:visible="dialogOpen"
    header="Введите PIN"
    :closable="false"
    :draggable="false"
    :pt="{ root: { class: 'guest-exit-dialog' } }"
    modal
    block-scroll
    @after-hide="error = ''"
  >
    <PinKeypad ref="keypad" :error="error" :busy="busy" @submit="submit" @cancel="dialogOpen = false" />
  </Dialog>
</template>

<style lang="sass" scoped>
@use './GuestExit'
</style>

<style lang="sass">
@use './GuestExitDialog'
</style>
