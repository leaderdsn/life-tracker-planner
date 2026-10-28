<script setup lang="ts">
import { computed } from 'vue'

import { chipBackground, initialsOf } from './participantView'

import type { EventStatus, Participant, ScheduleEvent } from '../model/types'

const props = defineProps<{
  event: ScheduleEvent
  participants: Participant[]
  status: EventStatus
  done?: boolean
  conflict?: boolean
  showTime?: boolean
  canToggle?: boolean
  labels?: Record<string, string>
}>()

const emit = defineEmits<{
  open: []
  toggle: []
}>()

const initials = computed(() =>
  props.labels ? props.participants.map((p) => props.labels?.[p.id] ?? initialsOf([p])).join('') : initialsOf(props.participants),
)
const background = computed(() => chipBackground(props.participants))
const timeLabel = computed(() => (props.event.end ? `${props.event.start}–${props.event.end}` : props.event.start))

const stateNotes = computed(() => {
  const notes: string[] = []
  if (props.status === 'current') notes.push('идёт сейчас')
  if (props.status === 'next') notes.push('следующее')
  if (props.status === 'past') notes.push('прошло')
  if (props.done) notes.push('выполнено')
  if (props.conflict) notes.push('пересекается с другим занятием')
  if (props.event.needsReview) notes.push(`нужно проверить: ${props.event.needsReview}`)
  return notes
})

const ariaLabel = computed(() => {
  const who = props.participants.map((p) => p.name).join(', ')
  const place = props.event.place ? `, ${props.event.place}` : ''
  const notes = stateNotes.value.length ? `, ${stateNotes.value.join(', ')}` : ''
  return `${props.event.title}, ${who}, ${timeLabel.value}${place}${notes}. Открыть`
})
</script>

<template>
  <div
    class="event-chip"
    :class="{
      'is-current': status === 'current',
      'is-next': status === 'next',
      'is-past': status === 'past',
      'is-done': done,
      'has-conflict': conflict,
      'has-check': canToggle,
      'needs-review': Boolean(event.needsReview),
    }"
    :style="{ '--chip-bg': background }"
  >
    <button type="button" class="event-chip__main" :aria-label="ariaLabel" @click="emit('open')">
      <span class="event-chip__initials" aria-hidden="true">{{ initials }}</span>
      <span class="event-chip__body">
        <span class="event-chip__title">{{ event.title }}</span>
        <span v-if="showTime" class="event-chip__meta">{{ timeLabel }}</span>
        <span v-if="event.place" class="event-chip__meta">{{ event.place }}</span>
      </span>
    </button>
    <span v-if="conflict" class="event-chip__badge event-chip__badge--conflict" title="Пересекается с другим занятием">
      <i class="pi pi-exclamation-triangle" aria-hidden="true" />
    </span>
    <span
      v-if="event.needsReview"
      class="event-chip__badge event-chip__badge--review"
      :title="event.needsReview"
      aria-hidden="true"
    >?</span>
    <button
      v-if="canToggle"
      type="button"
      class="event-chip__check"
      :aria-pressed="Boolean(done)"
      :aria-label="done ? 'Снять отметку о выполнении' : 'Отметить выполненным'"
      @click="emit('toggle')"
    >
      <i :class="done ? 'pi pi-check-circle' : 'pi pi-circle'" aria-hidden="true" />
    </button>
  </div>
</template>

<style lang="sass" scoped>
@use './EventChip'
</style>
