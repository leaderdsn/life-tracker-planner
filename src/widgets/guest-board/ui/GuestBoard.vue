<script setup lang="ts">
import { computed, ref, toValue, watch } from 'vue'

import { alarmKey, eventStatus, initialLabels, occurrences, useScheduleStore, useSyncStore } from '@/entities/schedule'
import type { Occurrence, Participant } from '@/entities/schedule'
import { GuestEventCard, useGuestAlarms } from '@/features/guest-alarm'
import { SyncBadge } from '@/features/sync-settings'
import { parseIsoDate, toIsoDate } from '@/shared/lib'

import { useAlarmSound } from '../model/useAlarmSound'
import { useIdleReturn } from '../model/useIdleReturn'
import { useNow } from '../model/useNow'
import { useSwipe } from '../model/useSwipe'
import GuestColumn from './GuestColumn.vue'
import ParticipantBar from './ParticipantBar.vue'

import type { BoardItem } from '../model/types'

const clockFormat = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

const store = useScheduleStore()
const sync = useSyncStore()
const alarms = useGuestAlarms()
const now = useNow()

const selected = ref('all')
const labels = computed(() => initialLabels(store.sortedParticipants))

const todayIso = computed(() => toIsoDate(new Date(now.value)))
const dayOccurrences = computed(() => {
  const day = parseIsoDate(todayIso.value)
  return occurrences(store.events, day, day)
})

const ringingKeys = computed(
  () => new Set(toValue(alarms.ringing).map((occ: Occurrence) => alarmKey(occ.event.id, occ.date))),
)

const clock = computed(() => clockFormat.format(now.value))
const date = computed(() => {
  const text = dateFormat.format(now.value)
  return text.charAt(0).toUpperCase() + text.slice(1)
})

function toItem(occ: Occurrence, among: Occurrence[]): BoardItem {
  const key = alarmKey(occ.event.id, occ.date)
  const ringing = ringingKeys.value.has(key)
  return {
    key,
    occ,
    status: eventStatus(occ, among, now.value),
    ringing,
    seen: !ringing && key in sync.acks,
    participants: occ.event.participantIds.flatMap((id) => store.participantById(id) ?? []),
  }
}

const columns = computed(() => {
  const people = store.sortedParticipants.filter((p) => selected.value === 'all' || p.id === selected.value)
  return people.map((participant: Participant) => {
    const own = dayOccurrences.value.filter((occ) => occ.event.participantIds.includes(participant.id))
    return { participant, items: own.map((occ) => toItem(occ, own)) }
  })
})

const hiddenRinging = computed(() => {
  if (selected.value === 'all') return []
  return dayOccurrences.value
    .filter((occ) => ringingKeys.value.has(alarmKey(occ.event.id, occ.date)))
    .filter((occ) => !occ.event.participantIds.includes(selected.value))
    .map((occ) => toItem(occ, dayOccurrences.value))
})

watch(
  () => store.sortedParticipants.map((p) => p.id),
  (ids) => {
    if (selected.value !== 'all' && !ids.includes(selected.value)) selected.value = 'all'
  },
)

const order = computed(() => ['all', ...store.sortedParticipants.map((p) => p.id)])

function step(delta: number) {
  const index = order.value.indexOf(selected.value)
  selected.value = order.value[Math.min(order.value.length - 1, Math.max(0, index + delta))] ?? 'all'
}

const swipe = useSwipe({ left: () => step(1), right: () => step(-1) })

useIdleReturn({
  timeout: () => store.settings.guestIdleReturn * 1000,
  enabled: () => selected.value !== 'all',
  onIdle: () => (selected.value = 'all'),
})

useAlarmSound({
  active: () => ringingKeys.value.size > 0,
  sound: () => {
    const first = toValue(alarms.ringing)[0]
    return first ? alarms.soundOf(first) : store.settings.alarmSound
  },
  volume: () => store.settings.alarmVolume,
})

function dismiss(key: string) {
  alarms.ack(key)
}
</script>

<template>
  <div
    class="guest-board"
    @pointerdown="swipe.onPointerdown"
    @pointerup="swipe.onPointerup"
    @pointercancel="swipe.onPointercancel"
    @click.capture="swipe.onClickCapture"
  >
    <header class="guest-board__top">
      <div class="guest-board__time">
        <time class="guest-board__clock" :datetime="clock">{{ clock }}</time>
        <span class="guest-board__date">{{ date }}</span>
      </div>
      <div class="guest-board__tools">
        <p v-if="sync.status === 'offline'" class="guest-board__offline" role="status">
          <i class="pi pi-wifi" aria-hidden="true" />
          Нет связи, показываю последнее сохранённое
        </p>
        <SyncBadge compact />
        <slot name="actions" />
      </div>
    </header>

    <ParticipantBar
      :participants="store.sortedParticipants"
      :selected="selected"
      :labels="labels"
      @select="selected = $event"
    />

    <ul v-if="hiddenRinging.length" class="guest-board__alarms" aria-label="Сейчас звенит">
      <li v-for="item in hiddenRinging" :key="item.key">
        <GuestEventCard
          :title="item.occ.event.title"
          :time="item.occ.event.start"
          :place="item.occ.event.place"
          :participants="item.participants"
          :status="item.status"
          ringing
          show-who
          :labels="labels"
          @dismiss="dismiss(item.key)"
        />
      </li>
    </ul>

    <main class="guest-board__columns" :class="{ 'is-single': selected !== 'all' }">
      <p v-if="!columns.length" class="guest-board__empty">Участников пока нет</p>
      <GuestColumn
        v-for="col in columns"
        :key="col.participant.id"
        :participant="col.participant"
        :items="col.items"
        :wide="selected !== 'all'"
        :labels="labels"
        @dismiss="dismiss"
      />
    </main>
  </div>
</template>

<style lang="sass" scoped>
@use './GuestBoard'
</style>
