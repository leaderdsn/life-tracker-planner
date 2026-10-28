<script setup lang="ts">
import { computed } from 'vue'

import { initialLabels, occurrences, periodRange, progress, useChipState, useScheduleStore } from '@/entities/schedule'
import type { ProgressPeriod } from '@/entities/schedule'
import { parseIsoDate } from '@/shared/lib'
import { Avatar } from '@/shared/ui'

const props = defineProps<{
  participantId: string
}>()

const PERIODS: { value: ProgressPeriod; label: string }[] = [
  { value: 'day', label: 'Сегодня' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
]

const store = useScheduleStore()
const { now, todayIso } = useChipState()

const labels = computed(() => initialLabels(store.sortedParticipants))

const participants = computed(() =>
  props.participantId === 'all'
    ? store.sortedParticipants
    : store.sortedParticipants.filter((p) => p.id === props.participantId),
)

const sections = computed(() => {
  const ids = participants.value.map((p) => p.id)
  return PERIODS.map(({ value, label }) => {
    const { from, to } = periodRange(value, parseIsoDate(todayIso.value))
    const result = progress(store.completions, occurrences(store.events, from, to), ids, {
      autoComplete: store.settings.autoComplete,
      now: now.value,
    })
    return {
      value,
      label,
      rows: participants.value.map((p) => {
        const { done, total } = result[p.id] ?? { done: 0, total: 0 }
        return { participant: p, done, total, percent: total ? Math.round((done / total) * 100) : 0 }
      }),
    }
  })
})
</script>

<template>
  <section class="progress-panel" aria-labelledby="progress-title">
    <h2 id="progress-title" class="progress-panel__title">Выполнено</h2>
    <div class="progress-panel__sections">
      <article v-for="section in sections" :key="section.value" class="progress-panel__section">
        <h3 class="progress-panel__heading">{{ section.label }}</h3>
        <ul class="progress-panel__rows">
          <li v-for="row in section.rows" :key="row.participant.id" class="progress-panel__row">
            <Avatar :name="row.participant.name" :color="row.participant.color" :src="row.participant.avatar" :label="labels[row.participant.id]" size="xs" />
            <span class="progress-panel__name">{{ row.participant.name }}</span>
            <span class="progress-panel__count">{{ row.done }} из {{ row.total }}</span>
            <div
              class="progress-panel__bar"
              role="progressbar"
              :aria-label="`${row.participant.name}, ${section.label}`"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="row.percent"
            >
              <span class="progress-panel__fill" :style="{ width: `${row.percent}%` }" />
            </div>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style lang="sass" scoped>
@use './ProgressPanel'
</style>
