<script setup lang="ts">
import { computed } from 'vue'

import { EventChip, occurrences, useChipState, useScheduleStore } from '@/entities/schedule'
import type { Occurrence, Participant, ScheduleEvent } from '@/entities/schedule'
import { useToggleDone } from '@/features/toggle-done'
import { parseIsoDate } from '@/shared/lib'

type Entry = { kind: 'now'; label: string } | { kind: 'event'; occ: Occurrence }

const props = defineProps<{
  participantId: string
  anchor: string
}>()

const emit = defineEmits<{
  'open-event': [eventId: string]
}>()

const store = useScheduleStore()
const { labels, now, stateFor, todayIso } = useChipState()
const { canToggle, toggle, readOnly } = useToggleDone()

const pidFor = (event: ScheduleEvent) => (props.participantId === 'all' ? event.participantIds[0] : props.participantId)

const clock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

const occs = computed(() => {
  const day = parseIsoDate(props.anchor)
  return occurrences(store.eventsOf(props.participantId), day, day)
})

const entries = computed<Entry[]>(() => {
  const list: Entry[] = occs.value.map((occ) => ({ kind: 'event', occ }))
  if (props.anchor !== todayIso.value) return list
  const index = occs.value.findIndex((occ) => occ.startAt > now.value)
  const line: Entry = { kind: 'now', label: clock.format(now.value) }
  list.splice(index === -1 ? list.length : index, 0, line)
  return list
})

function participantsOf(occ: Occurrence): Participant[] {
  const ids = props.participantId === 'all' ? occ.event.participantIds : [props.participantId]
  return ids.flatMap((id) => store.participantById(id) ?? [])
}
</script>

<template>
  <div v-if="occs.length === 0" class="schedule-day__empty">В этот день занятий нет. Можно отдохнуть.</div>
  <ol v-else class="schedule-day" aria-label="Расписание на день">
    <template v-for="entry in entries" :key="entry.kind === 'now' ? 'now' : entry.occ.event.id">
      <li v-if="entry.kind === 'now'" class="schedule-day__now" aria-label="Сейчас">
        <span class="schedule-day__now-time">{{ entry.label }}</span>
        <span class="schedule-day__now-line" aria-hidden="true" />
        <span class="schedule-day__now-text">сейчас</span>
      </li>
      <li v-else class="schedule-day__item">
        <span class="schedule-day__time">{{ entry.occ.event.start }}</span>
        <EventChip
          class="schedule-day__chip"
          :event="entry.occ.event"
          :participants="participantsOf(entry.occ)"
          :labels="labels"
          :status="stateFor(entry.occ.event, anchor, pidFor(entry.occ.event)).status"
          :done="stateFor(entry.occ.event, anchor, pidFor(entry.occ.event)).done"
          :completion="stateFor(entry.occ.event, anchor, pidFor(entry.occ.event)).completion"
          :conflict="stateFor(entry.occ.event, anchor, pidFor(entry.occ.event)).conflict"
          :can-toggle="canToggle(anchor, entry.occ.event)"
          :readonly="readOnly"
          show-time
          @open="emit('open-event', entry.occ.event.id)"
          @toggle="toggle(entry.occ.event.id, anchor, pidFor(entry.occ.event))"
        />
      </li>
    </template>
  </ol>
</template>

<style lang="sass" scoped>
@use './ScheduleDay'
</style>
