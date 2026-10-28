<script setup lang="ts">
import { computed } from 'vue'

import { isDoneState } from '../lib'
import { chipBackground, initialsOf } from './participantView'

import type { EffectiveCompletion } from '../lib'
import type { EventStatus, Participant, ScheduleEvent } from '../model/types'

const props = defineProps<{
  event: ScheduleEvent
  participants: Participant[]
  status: EventStatus
  done?: boolean
  completion?: EffectiveCompletion
  conflict?: boolean
  showTime?: boolean
  canToggle?: boolean
  /** Participants view only: the card is not a button and never opens the editor. */
  readonly?: boolean
  labels?: Record<string, string>
}>()

const emit = defineEmits<{
  open: []
  toggle: []
}>()

const initials = computed(() =>
  props.labels ? props.participants.map((p) => props.labels?.[p.id] ?? initialsOf([p])).join('·') : initialsOf(props.participants),
)
const state = computed<EffectiveCompletion>(() => props.completion ?? (props.done ? 'done' : null))
const isDone = computed(() => isDoneState(state.value))
const checkLabel = computed(() => {
  if (state.value === 'auto') return 'Отмечено автоматически — нажмите, чтобы отметить как невыполненное'
  if (state.value === 'skipped') return 'Отмечено как невыполненное — нажмите, чтобы снять отметку'
  return state.value === 'done' ? 'Снять отметку о выполнении' : 'Отметить выполненным'
})
const checkIcon = computed(() => {
  if (state.value === 'skipped') return 'pi pi-times-circle'
  return isDone.value ? 'pi pi-check-circle' : 'pi pi-circle'
})
const background = computed(() => chipBackground(props.participants))
const timeLabel = computed(() => (props.event.end ? `${props.event.start}–${props.event.end}` : props.event.start))

const stateNotes = computed(() => {
  const notes: string[] = []
  if (props.status === 'current') notes.push('идёт сейчас')
  if (props.status === 'next') notes.push('следующее')
  if (props.status === 'past') notes.push('прошло')
  if (state.value === 'done') notes.push('выполнено')
  if (state.value === 'auto') notes.push('выполнено автоматически')
  if (state.value === 'skipped') notes.push('не выполнено')
  if (props.conflict) notes.push('пересекается с другим занятием')
  if (props.event.needsReview) notes.push(`нужно проверить: ${props.event.needsReview}`)
  return notes
})

const ariaLabel = computed(() => {
  const who = props.participants.map((p) => p.name).join(', ')
  const place = props.event.place ? `, ${props.event.place}` : ''
  const notes = stateNotes.value.length ? `, ${stateNotes.value.join(', ')}` : ''
  return `${props.event.title}, ${who}, ${timeLabel.value}${place}${notes}${props.readonly ? '' : '. Открыть'}`
})
</script>

<template>
  <div
    class="event-chip"
    :class="{
      'is-current': status === 'current',
      'is-next': status === 'next',
      'is-past': status === 'past',
      'is-done': isDone,
      'is-auto': state === 'auto',
      'is-skipped': state === 'skipped',
      'has-conflict': conflict,
      'has-check': canToggle,
      'needs-review': Boolean(event.needsReview),
    }"
    :style="{ '--chip-bg': background }"
  >
    <component
      :is="readonly ? 'div' : 'button'"
      class="event-chip__main"
      :class="{ 'is-readonly': readonly }"
      :type="readonly ? undefined : 'button'"
      :role="readonly ? 'group' : undefined"
      :aria-label="ariaLabel"
      @click="readonly ? undefined : emit('open')"
    >
      <span class="event-chip__initials" aria-hidden="true">{{ initials }}</span>
      <span class="event-chip__body">
        <span class="event-chip__title">{{ event.title }}</span>
        <span v-if="showTime" class="event-chip__meta">{{ timeLabel }}</span>
        <span v-if="event.place" class="event-chip__meta">{{ event.place }}</span>
      </span>
    </component>
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
      :aria-pressed="isDone"
      :aria-label="checkLabel"
      :title="state === 'auto' ? checkLabel : undefined"
      @click="emit('toggle')"
    >
      <i :class="checkIcon" aria-hidden="true" />
      <span v-if="state === 'auto'" class="event-chip__auto" aria-hidden="true">авто</span>
    </button>
  </div>
</template>

<style lang="sass" scoped>
@use './EventChip'
</style>
