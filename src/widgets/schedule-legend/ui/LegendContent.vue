<script setup lang="ts">
import { computed } from 'vue'

import { EventChip, initialLabels, useScheduleStore } from '@/entities/schedule'
import type { Participant, ScheduleEvent } from '@/entities/schedule'
import { GuestEventCard } from '@/features/guest-alarm'

const store = useScheduleStore()

const FALLBACK: Participant = { id: 'demo', name: 'Участник', color: '#CFE2FF', order: 0 }
const FALLBACK_SECOND: Participant = { id: 'demo2', name: 'Участник', color: '#CDEFD6', order: 1 }

const demoEvent: ScheduleEvent = {
  id: 'legend-demo',
  participantIds: ['demo'],
  day: 'mon',
  start: '10:00',
  title: 'Занятие',
  category: 'activity',
}
const reviewEvent: ScheduleEvent = { ...demoEvent, needsReview: 'Проверьте' }

const people = computed(() => store.sortedParticipants)
const labels = computed(() => ({ ...initialLabels(people.value), demo: 'У', demo2: 'Д' }))
const sample = computed(() => people.value[0] ?? FALLBACK)
const shared = computed(() => (people.value.length > 1 ? people.value.slice(0, 2) : [sample.value, FALLBACK_SECOND]))
const noop = () => undefined
</script>

<template>
  <div class="legend">
    <section class="legend__group" aria-labelledby="legend-people">
      <h3 id="legend-people" class="legend__heading">Участники</h3>
      <ul class="legend__list">
        <li v-for="p in people" :key="p.id" class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[p]" :labels="labels" status="upcoming" />
          </span>
          <span class="legend__text">{{ p.name }}</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="shared" :labels="labels" status="upcoming" />
          </span>
          <span class="legend__text">Двухцветная карточка: общее занятие нескольких участников</span>
        </li>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-time">
      <h3 id="legend-time" class="legend__heading">Время</h3>
      <ul class="legend__list">
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="current" />
          </span>
          <span class="legend__text">Идёт сейчас</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="next" />
          </span>
          <span class="legend__text">Следующее</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="past" />
          </span>
          <span class="legend__text">Прошло</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true"><span class="legend__today" /></span>
          <span class="legend__text">Сегодня: подсвеченный столбец</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true"><span class="legend__now" /></span>
          <span class="legend__text">Текущее время в дневном виде</span>
        </li>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-done">
      <h3 id="legend-done" class="legend__heading">Выполнение</h3>
      <ul class="legend__list">
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="past" completion="done" can-toggle @toggle="noop" />
          </span>
          <span class="legend__text">Выполнено</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="past" completion="auto" can-toggle @toggle="noop" />
          </span>
          <span class="legend__text">Отмечено автоматически</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="past" completion="skipped" can-toggle @toggle="noop" />
          </span>
          <span class="legend__text">Не выполнено</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="upcoming" can-toggle @toggle="noop" />
          </span>
          <span class="legend__text">Нажмите на кружок, чтобы отметить</span>
        </li>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-warn">
      <h3 id="legend-warn" class="legend__heading">Внимание</h3>
      <ul class="legend__list">
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="demoEvent" :participants="[sample]" :labels="labels" status="upcoming" conflict />
          </span>
          <span class="legend__text">Пересечение по времени у одного участника</span>
        </li>
        <li class="legend__row">
          <span class="legend__sample" aria-hidden="true" inert>
            <EventChip :event="reviewEvent" :participants="[sample]" :labels="labels" status="upcoming" />
          </span>
          <span class="legend__text">Проверьте: спорное место из исходной таблицы</span>
        </li>
      </ul>
    </section>

    <section class="legend__group" aria-labelledby="legend-guest">
      <h3 id="legend-guest" class="legend__heading">Гостевой экран</h3>
      <ul class="legend__list">
        <li class="legend__row legend__row--stack">
          <span class="legend__sample legend__sample--card" aria-hidden="true" inert>
            <GuestEventCard title="Занятие" time="10:00" :participants="[sample]" status="current" ringing />
          </span>
          <span class="legend__text">Звенит у гостя: можно отключить на панели сверху</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style lang="sass" scoped>
@use './LegendContent'
</style>
