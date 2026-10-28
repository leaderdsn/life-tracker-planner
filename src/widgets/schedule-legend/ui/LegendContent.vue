<script setup lang="ts">
import { computed } from 'vue'

import { EventChip, initialLabels, useDeviceStore, useScheduleStore } from '@/entities/schedule'
import type { Participant, ScheduleEvent } from '@/entities/schedule'
import { GuestEventCard } from '@/features/guest-alarm'
import { Avatar } from '@/shared/ui'

import LegendRow from './LegendRow.vue'

const store = useScheduleStore()
const device = useDeviceStore()

const FALLBACK: Participant = { id: 'demo', name: 'Участник', color: '#CFE2FF', order: 0 }
const FALLBACK_SECOND: Participant = { id: 'demo2', name: 'Участник', color: '#CDEFD6', order: 1 }

function sampleEvent(title: string, extra: Partial<ScheduleEvent> = {}): ScheduleEvent {
  return { id: `legend-${title}`, participantIds: ['demo'], day: 'mon', start: '10:00', title, category: 'activity', ...extra }
}

const events = {
  current: sampleEvent('Алгебра'),
  next: sampleEvent('Бассейн'),
  past: sampleEvent('Вокал'),
  done: sampleEvent('Танцы'),
  auto: sampleEvent('Чтение'),
  skipped: sampleEvent('Йога'),
  open: sampleEvent('Химия'),
  conflict: sampleEvent('Футбол'),
  review: sampleEvent('Музыка', { needsReview: 'Проверьте' }),
}

const everyone = computed(() => store.sortedParticipants)
const people = computed(() =>
  device.role === 'participant' ? everyone.value.filter((p) => p.id === device.participantId) : everyone.value,
)
const labels = computed<Record<string, string>>(() => ({ ...initialLabels(everyone.value), demo: 'У', demo2: 'Д' }))
const sample = computed(() => people.value[0] ?? FALLBACK)
const shared = computed(() => (everyone.value.length > 1 ? everyone.value.slice(0, 2) : [sample.value, FALLBACK_SECOND]))
const showGuest = computed(() => device.role === 'admin')
const noop = () => undefined
const SHARED_NOTE = 'Два значка рядом: общее занятие нескольких участников'
</script>

<template>
  <div class="legend">
    <section class="legend__group" aria-labelledby="legend-people">
      <h3 id="legend-people" class="legend__heading">Участники</h3>
      <ul class="legend__list">
        <li v-for="p in people" :key="p.id" class="legend__person">
          <Avatar :name="p.name" :color="p.color" :src="p.avatar" :label="labels[p.id]" size="md" />
          <span class="legend__name" :title="p.name">{{ p.name }}</span>
        </li>
        <li class="legend__person">
          <span class="legend__pair" aria-hidden="true">
            <Avatar v-for="p in shared" :key="p.id" :name="p.name" :color="p.color" :label="labels[p.id]" size="md" />
          </span>
          <span class="legend__note" :title="SHARED_NOTE">{{ SHARED_NOTE }}</span>
        </li>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-time">
      <h3 id="legend-time" class="legend__heading">Время</h3>
      <ul class="legend__list">
        <LegendRow decorative text="Идёт сейчас">
          <EventChip :event="events.current" :participants="[sample]" :labels="labels" status="current" />
        </LegendRow>
        <LegendRow decorative text="Следующее">
          <EventChip :event="events.next" :participants="[sample]" :labels="labels" status="next" />
        </LegendRow>
        <LegendRow decorative text="Прошло">
          <EventChip :event="events.past" :participants="[sample]" :labels="labels" status="past" />
        </LegendRow>
        <LegendRow decorative text="Сегодня: подсвеченный столбец">
          <span class="legend__today" />
        </LegendRow>
        <LegendRow decorative text="Текущее время в дневном виде">
          <span class="legend__now" />
        </LegendRow>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-done">
      <h3 id="legend-done" class="legend__heading">Выполнение</h3>
      <ul class="legend__list">
        <LegendRow decorative text="Выполнено">
          <EventChip :event="events.done" :participants="[sample]" :labels="labels" status="past" completion="done" can-toggle @toggle="noop" />
        </LegendRow>
        <LegendRow decorative text="Отмечено автоматически">
          <EventChip :event="events.auto" :participants="[sample]" :labels="labels" status="past" completion="auto" can-toggle @toggle="noop" />
        </LegendRow>
        <LegendRow decorative text="Не выполнено">
          <EventChip :event="events.skipped" :participants="[sample]" :labels="labels" status="past" completion="skipped" can-toggle @toggle="noop" />
        </LegendRow>
        <LegendRow decorative text="Нажмите на кружок, чтобы отметить">
          <EventChip :event="events.open" :participants="[sample]" :labels="labels" status="upcoming" can-toggle @toggle="noop" />
        </LegendRow>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-warn">
      <h3 id="legend-warn" class="legend__heading">Внимание</h3>
      <ul class="legend__list">
        <LegendRow decorative text="Пересечение по времени у одного участника">
          <EventChip :event="events.conflict" :participants="[sample]" :labels="labels" status="upcoming" conflict />
        </LegendRow>
        <LegendRow decorative text="Проверьте: спорное место из исходной таблицы">
          <EventChip :event="events.review" :participants="[sample]" :labels="labels" status="upcoming" />
        </LegendRow>
      </ul>
    </section>

    <section v-if="showGuest" class="legend__group" aria-labelledby="legend-guest">
      <h3 id="legend-guest" class="legend__heading">Гостевой экран</h3>
      <ul class="legend__list">
        <LegendRow decorative stack text="Звенит у гостя: можно отключить на панели сверху">
          <GuestEventCard title="Бассейн" time="10:00" :participants="[sample]" status="current" ringing />
        </LegendRow>
      </ul>
    </section>
  </div>
</template>

<style lang="sass" scoped>
@use './LegendContent'
</style>
