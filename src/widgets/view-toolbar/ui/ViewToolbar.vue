<script setup lang="ts">
import { computed } from 'vue'

import { addDays, parseIsoDate, startOfWeek } from '@/shared/lib'

import { VIEW_OPTIONS } from '../config/views'

import type { ScheduleView } from '../config/views'

const props = defineProps<{
  view: ScheduleView
  anchor: string
}>()

const emit = defineEmits<{
  'update:view': [view: ScheduleView]
  step: [direction: -1 | 1]
  today: []
}>()

const day = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })
const short = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const month = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

const label = computed(() => {
  const date = parseIsoDate(props.anchor)
  if (props.view === 'day') return capitalize(day.format(date))
  if (props.view === 'month') return capitalize(month.format(date).replace(/\s?г\.$/, ''))
  const monday = startOfWeek(date)
  return capitalize(`${short.format(monday)} – ${short.format(addDays(monday, 6))}`)
})
</script>

<template>
  <div class="view-toolbar">
    <SelectButton
      :model-value="view"
      :options="[...VIEW_OPTIONS]"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      aria-label="Вид расписания"
      @update:model-value="emit('update:view', $event)"
    />
    <div class="view-toolbar__row">
      <div class="view-toolbar__nav">
        <Button
          icon="pi pi-chevron-left"
          severity="secondary"
          variant="text"
          rounded
          aria-label="Предыдущий период"
          @click="emit('step', -1)"
        />
        <Button label="Сегодня" severity="secondary" size="small" @click="emit('today')" />
        <Button
          icon="pi pi-chevron-right"
          severity="secondary"
          variant="text"
          rounded
          aria-label="Следующий период"
          @click="emit('step', 1)"
        />
      </div>
      <p class="view-toolbar__label" aria-live="polite">{{ label }}</p>
      <slot />
    </div>
  </div>
</template>

<style lang="sass" scoped>
@use './ViewToolbar'
</style>
