<script setup lang="ts">
import { computed } from 'vue'

import {
  buildGrid,
  EventChip,
  eventsForWeek,
  useChipState,
  useScheduleStore,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  WEEKDAYS,
} from '@/entities/schedule'
import type { Participant, ScheduleEvent, Weekday } from '@/entities/schedule'
import { useToggleDone } from '@/features/toggle-done'
import { addDays, parseIsoDate, startOfWeek, toIsoDate } from '@/shared/lib'

const props = defineProps<{
  participantId: string
  anchor: string
}>()

const emit = defineEmits<{
  'open-event': [eventId: string]
  'open-day': [date: string]
}>()

const store = useScheduleStore()
const { labels, stateFor, todayIso } = useChipState()
const { canToggle, toggle, readOnly } = useToggleDone()

const dayNumber = new Intl.DateTimeFormat('ru-RU', { day: 'numeric' })

const pidFor = (event: ScheduleEvent) => (props.participantId === 'all' ? event.participantIds[0] : props.participantId)

const weekStart = computed(() => startOfWeek(parseIsoDate(props.anchor)))

const grid = computed(() => {
  const events = eventsForWeek(store.eventsOf(props.participantId), weekStart.value)
  return buildGrid(events)
})

const columns = computed(() =>
  grid.value.days.map((day) => {
    const date = toIsoDate(addDays(weekStart.value, WEEKDAYS.indexOf(day)))
    return { day, date, isToday: date === todayIso.value, number: dayNumber.format(parseIsoDate(date)) }
  }),
)

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
    {{ readOnly ? 'На этой неделе занятий нет.' : 'На этой неделе занятий нет. Добавьте их в расписание участника.' }}
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
