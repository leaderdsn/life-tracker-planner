<script setup lang="ts">
import { computed } from 'vue'

import { occurrences, ParticipantDot, progress, useChipState, useScheduleStore, WEEKDAY_SHORT, WEEKDAYS } from '@/entities/schedule'
import type { Occurrence, Participant } from '@/entities/schedule'
import { addDays, parseIsoDate, startOfWeek, toIsoDate } from '@/shared/lib'

type DayCell = {
  date: string
  number: number
  inMonth: boolean
  isToday: boolean
  total: number
  done: number
  participants: Participant[]
}

const props = defineProps<{
  participantId: string
  anchor: string
}>()

const emit = defineEmits<{
  'open-day': [date: string]
}>()

const store = useScheduleStore()
const { now, todayIso } = useChipState()

const fullDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })

const cells = computed<DayCell[]>(() => {
  const anchor = parseIsoDate(props.anchor)
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const from = startOfWeek(first)
  const to = addDays(startOfWeek(last), 6)

  const byDate = new Map<string, Occurrence[]>()
  for (const occ of occurrences(store.eventsOf(props.participantId), from, to)) {
    const list = byDate.get(occ.date) ?? []
    list.push(occ)
    byDate.set(occ.date, list)
  }

  const ids =
    props.participantId === 'all' ? store.sortedParticipants.map((p) => p.id) : [props.participantId]
  const result: DayCell[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const date = toIsoDate(d)
    const occs = byDate.get(date) ?? []
    const counters = Object.values(progress(store.completions, occs, ids, { autoComplete: store.settings.autoComplete, now: now.value }))
    const present = new Set(occs.flatMap((o) => o.event.participantIds))
    result.push({
      date,
      number: d.getDate(),
      inMonth: d.getMonth() === first.getMonth(),
      isToday: date === todayIso.value,
      total: counters.reduce((sum, c) => sum + c.total, 0),
      done: counters.reduce((sum, c) => sum + c.done, 0),
      participants: store.sortedParticipants.filter((p) => ids.includes(p.id) && present.has(p.id)),
    })
  }
  return result
})

function label(cell: DayCell): string {
  const base = fullDate.format(parseIsoDate(cell.date))
  if (cell.total === 0) return `${base}: занятий нет`
  return `${base}: выполнено ${cell.done} из ${cell.total}`
}
</script>

<template>
  <div class="schedule-month" role="group" aria-label="Расписание на месяц">
    <div class="schedule-month__weekdays">
      <span v-for="day in WEEKDAYS" :key="day">{{ WEEKDAY_SHORT[day] }}</span>
    </div>
    <div class="schedule-month__grid">
      <button
        v-for="cell in cells"
        :key="cell.date"
        type="button"
        class="schedule-month__cell"
        :class="{ 'is-outside': !cell.inMonth, 'is-today': cell.isToday, 'is-complete': cell.total > 0 && cell.done === cell.total }"
        :aria-label="label(cell)"
        :aria-current="cell.isToday ? 'date' : undefined"
        @click="emit('open-day', cell.date)"
      >
        <span class="schedule-month__number">{{ cell.number }}</span>
        <template v-if="cell.total > 0">
          <span class="schedule-month__bar" aria-hidden="true">
            <span class="schedule-month__fill" :style="{ width: `${(cell.done / cell.total) * 100}%` }" />
          </span>
          <span class="schedule-month__count" aria-hidden="true">{{ cell.done }}/{{ cell.total }}</span>
          <span class="schedule-month__dots" aria-hidden="true">
            <ParticipantDot v-for="p in cell.participants" :key="p.id" :color="p.color" />
          </span>
        </template>
      </button>
    </div>
  </div>
</template>

<style lang="sass" scoped>
@use './ScheduleMonth'
</style>
