<script setup lang="ts">
import { computed } from 'vue'

import {
  buildGrid,
  EventChip,
  eventsForWeek,
  useChipState,
  useScheduleStore,
  visibleInAll,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  WEEKDAYS,
} from '@/entities/schedule'
import type { Participant, ScheduleEvent, Weekday } from '@/entities/schedule'
import { useToggleDone } from '@/features/toggle-done'
import { addDays, minutes, parseIsoDate, startOfWeek, toIsoDate } from '@/shared/lib'

const props = defineProps<{
  participantId: string
  anchor: string
}>()

const emit = defineEmits<{
  'open-event': [eventId: string]
  'open-day': [date: string]
}>()

const store = useScheduleStore()
const { labels, now, stateFor, todayIso } = useChipState()
const { canToggle, toggle, readOnly } = useToggleDone()

const dayNumber = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' })

const pidFor = (event: ScheduleEvent) => (props.participantId === 'all' ? event.participantIds[0] : props.participantId)

const weekStart = computed(() => startOfWeek(parseIsoDate(props.anchor)))

const grid = computed(() => {
  const source = store.eventsOf(props.participantId)
  const events = eventsForWeek(props.participantId === 'all' ? source.filter(visibleInAll) : source, weekStart.value)
  return buildGrid(events)
})

const columns = computed(() =>
  grid.value.days.map((day) => {
    const date = toIsoDate(addDays(weekStart.value, WEEKDAYS.indexOf(day)))
    return { day, date, isToday: date === todayIso.value, number: dayNumber.format(parseIsoDate(date)) }
  }),
)

const NOW_TAIL_MINUTES = 60

/** Row that contains the current time and how far through it we are (0..1); null when outside the rows. */
const nowMark = computed(() => {
  const rows = grid.value.rows
  const current = new Date(now.value)
  const at = current.getHours() * 60 + current.getMinutes()
  let index = -1
  rows.forEach((row, i) => {
    if (minutes(row.time) <= at) index = i
  })
  const first = rows[index]
  if (!first) return null
  const next = rows[index + 1]
  const span = next ? minutes(next.time) - minutes(first.time) : NOW_TAIL_MINUTES
  const progress = (at - minutes(first.time)) / span
  if (progress > 1) return null
  return { index, progress }
})

function nowOffset(rowIndex: number, isToday: boolean): string | null {
  const mark = nowMark.value
  if (!isToday || !mark || mark.index !== rowIndex) return null
  // Snap to the nearest row boundary so the line never cuts through a card
  return mark.progress < 0.5 ? '0%' : '100%'
}

function participantsOf(event: ScheduleEvent): Participant[] {
  const ids = props.participantId === 'all' ? event.participantIds : [props.participantId]
  return ids.flatMap((id) => store.participantById(id) ?? [])
}

function eventsAt(rowIndex: number, day: Weekday): ScheduleEvent[] {
  return grid.value.rows[rowIndex]?.cells[day] ?? []
}
</script>

<template>
  <div v-if="grid.rows.length === 0" class="schedule-week__empty">
    <span class="schedule-week__empty-art" aria-hidden="true"><i class="pi pi-calendar" /></span>
    <p class="schedule-week__empty-title">На этой неделе занятий нет</p>
    <p class="schedule-week__empty-hint">
      {{ readOnly ? 'Можно отдохнуть.' : 'Добавьте их в расписание участника.' }}
    </p>
  </div>
  <div v-else class="schedule-week" tabindex="0" role="region" aria-label="Расписание на неделю">
    <table class="schedule-week__table" :style="{ '--cols': columns.length }">
      <thead>
        <tr>
          <th class="schedule-week__corner" scope="col"><span class="schedule-week__sr">Время</span></th>
          <th
            v-for="col in columns"
            :key="col.day"
            scope="col"
            class="schedule-week__head"
            :class="{ 'is-today': col.isToday }"
            :aria-current="col.isToday ? 'date' : undefined"
          >
            <button
              type="button"
              class="schedule-week__day"
              :aria-label="`${WEEKDAY_NAMES[col.day]}, ${col.number}: открыть день`"
              @click="emit('open-day', col.date)"
            >
              <span>{{ WEEKDAY_SHORT[col.day] }}</span>
              <span class="schedule-week__num">{{ col.number }}</span>
            </button>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in grid.rows" :key="row.time">
          <th scope="row" class="schedule-week__time">{{ row.time }}</th>
          <td v-for="col in columns" :key="col.day" class="schedule-week__cell" :class="{ 'is-today': col.isToday }">
            <span
              v-if="nowOffset(rowIndex, col.isToday)"
              class="schedule-week__now"
              :style="{ '--now-offset': nowOffset(rowIndex, col.isToday) ?? '0%' }"
              aria-hidden="true"
            />
            <ul class="schedule-week__chips">
              <li v-for="event in eventsAt(rowIndex, col.day)" :key="event.id">
                <EventChip
                  :event="event"
                  :participants="participantsOf(event)"
                  :labels="labels"
                  :status="stateFor(event, col.date, pidFor(event)).status"
                  :done="stateFor(event, col.date, pidFor(event)).done"
                  :completion="stateFor(event, col.date, pidFor(event)).completion"
                  :conflict="stateFor(event, col.date, pidFor(event)).conflict"
                  :can-toggle="canToggle(col.date, event)"
                  :readonly="readOnly"
                  :mark-hidden="participantId !== 'all' && !readOnly"
                  @open="emit('open-event', event.id)"
                  @toggle="toggle(event.id, col.date, pidFor(event))"
                />
              </li>
            </ul>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="sass" scoped>
@use './ScheduleWeek'
</style>
