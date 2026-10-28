<script setup lang="ts">
import { computed } from 'vue'

import { SOUND_GROUPS, SOUND_LABELS, useScheduleStore } from '@/entities/schedule'
import type { AlarmSound } from '@/entities/schedule'
import { playOnce, unlockAudio } from '@/shared/lib'

defineProps<{
  inputId: string
}>()

const model = defineModel<AlarmSound | undefined>({ required: true })

const DEFAULT_VALUE = 'default'
const OPTIONS = [
  { label: 'По умолчанию', items: [{ label: 'Как на гостевом экране', value: DEFAULT_VALUE }] },
  ...SOUND_GROUPS.map(({ label, sounds }) => ({
    label,
    items: sounds.map((value) => ({ label: SOUND_LABELS[value], value })),
  })),
]

const store = useScheduleStore()

const selected = computed(() => model.value ?? DEFAULT_VALUE)

function select(value: AlarmSound | typeof DEFAULT_VALUE) {
  model.value = value === DEFAULT_VALUE ? undefined : value
}

async function preview() {
  await unlockAudio()
  playOnce(model.value ?? store.settings.alarmSound, store.settings.alarmVolume)
}
</script>

<template>
  <div class="sound-picker">
    <Select
      :input-id="inputId"
      :model-value="selected"
      :options="OPTIONS"
      option-label="label"
      option-value="value"
      option-group-label="label"
      option-group-children="items"
      @update:model-value="select"
    />
    <Button label="Прослушать" icon="pi pi-volume-up" severity="secondary" @click="preview" />
  </div>
</template>

<style lang="sass" scoped>
@use './SoundPicker'
</style>
