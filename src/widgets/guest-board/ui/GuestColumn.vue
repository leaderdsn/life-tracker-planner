<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import { ParticipantDot } from '@/entities/schedule'
import type { Participant } from '@/entities/schedule'
import { GuestEventCard } from '@/features/guest-alarm'

import type { BoardItem } from '../model/types'

const props = defineProps<{
  participant: Participant
  items: BoardItem[]
  wide?: boolean
  labels: Record<string, string>
}>()

const emit = defineEmits<{
  dismiss: [key: string]
}>()

const SCROLL_TOP_OFFSET = 0.15

const list = ref<HTMLElement | null>(null)

const targetKey = computed(
  () =>
    (
      props.items.find((i) => i.ringing) ??
      props.items.find((i) => i.status === 'current') ??
      props.items.find((i) => i.status === 'next')
    )?.key ?? null,
)

async function scrollToTarget() {
  await nextTick()
  const container = list.value
  if (!container || !targetKey.value || typeof container.scrollTo !== 'function') return
  const card = [...container.querySelectorAll<HTMLElement>('[data-key]')].find((el) => el.dataset.key === targetKey.value)
  if (!card) return
  container.scrollTo({
    top: Math.max(0, card.offsetTop - container.clientHeight * SCROLL_TOP_OFFSET),
    behavior: 'smooth',
  })
}

onMounted(scrollToTarget)
watch(targetKey, scrollToTarget)

const pending = computed(() => props.items.filter((i) => i.status !== 'past').length)
</script>

<template>
  <section class="guest-column" :class="{ 'is-wide': wide }" :aria-label="`Расписание: ${participant.name}`">
    <header class="guest-column__head">
      <ParticipantDot :color="participant.color" class="guest-column__dot" />
      <h2 class="guest-column__name">{{ participant.name }}</h2>
      <span v-if="items.length" class="guest-column__count">
        {{ pending ? `осталось ${pending}` : 'всё готово' }}
      </span>
    </header>

    <p v-if="!items.length" class="guest-column__empty">Сегодня занятий нет</p>
    <ol v-else ref="list" class="guest-column__list">
      <li v-for="item in items" :key="item.key" class="guest-column__item" :data-key="item.key">
        <GuestEventCard
          :title="item.occ.event.title"
          :time="item.occ.event.end ? `${item.occ.event.start}–${item.occ.event.end}` : item.occ.event.start"
          :place="item.occ.event.place"
          :participants="item.participants"
          :status="item.status"
          :seen="item.seen"
          :ringing="item.ringing"
          :show-who="item.participants.length > 1"
          :labels="labels"
          @dismiss="emit('dismiss', item.key)"
        />
      </li>
    </ol>
  </section>
</template>

<style lang="sass" scoped>
@use './GuestColumn'
</style>
