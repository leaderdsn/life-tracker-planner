<script setup lang="ts">
import { computed } from 'vue'

import { validateTime } from '@/shared/lib'

const props = defineProps<{
  id: string
  label: string
  optional?: boolean
  placeholder?: string
}>()

const model = defineModel<string>({ required: true })

const feedback = computed(() => {
  const raw = model.value.trim()
  if (!raw) return { kind: 'hint' as const, text: props.optional ? 'Можно оставить пустым' : 'Например, 8.30' }
  const result = validateTime(raw)
  if ('error' in result) return { kind: 'error' as const, text: result.error }
  return { kind: 'ok' as const, text: raw === result.value ? result.value : `${raw} → ${result.value}` }
})
</script>

<template>
  <div class="time-input">
    <label class="time-input__label" :for="id">{{ label }}</label>
    <InputText
      :id="id"
      v-model="model"
      class="time-input__field"
      inputmode="text"
      autocomplete="off"
      :placeholder="placeholder ?? '08:30'"
      :invalid="feedback.kind === 'error'"
      :aria-describedby="`${id}-feedback`"
    />
    <p
      :id="`${id}-feedback`"
      class="time-input__feedback"
      :class="`is-${feedback.kind}`"
      aria-live="polite"
    >
      <i v-if="feedback.kind === 'ok'" class="pi pi-check" aria-hidden="true" />
      <i v-else-if="feedback.kind === 'error'" class="pi pi-exclamation-circle" aria-hidden="true" />
      {{ feedback.text }}
    </p>
  </div>
</template>

<style lang="sass" scoped>
@use './TimeInput'
</style>
