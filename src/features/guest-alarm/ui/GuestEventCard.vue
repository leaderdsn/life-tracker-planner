<script setup lang="ts">
import { computed } from 'vue'

import { chipBackground, initialOf } from '@/entities/schedule'
import type { EventStatus, Participant } from '@/entities/schedule'

const props = defineProps<{
  title: string
  time: string
  place?: string
  participants: Participant[]
  status: EventStatus
  seen?: boolean
  ringing?: boolean
  showWho?: boolean
  labels?: Record<string, string>
}>()

const emit = defineEmits<{
  dismiss: []
}>()

const background = computed(() => chipBackground(props.participants))
const initials = computed(() =>
  props.participants.map((p) => props.labels?.[p.id] ?? initialOf(p.name)).join('·'),
)
const tag = computed(() => {
  if (props.status === 'current') return 'Сейчас'
  if (props.status === 'next') return 'Дальше'
  return ''
})

function onClick() {
  if (props.ringing) emit('dismiss')
}
</script>

<template>
  <component
    :is="ringing ? 'button' : 'div'"
    class="guest-card"
    :class="{
      'is-ringing': ringing,
      'is-seen': seen && !ringing,
      'is-current': status === 'current',
      'is-next': status === 'next',
      'is-past': status === 'past',
    }"
    :style="{ '--card-bg': background }"
    :type="ringing ? 'button' : undefined"
    :aria-live="ringing ? 'assertive' : undefined"
    @click="onClick"
  >
    <span class="guest-card__row">
      <span class="guest-card__time">{{ time }}</span>
      <span class="guest-card__body">
        <span class="guest-card__title">{{ title }}</span>
        <span v-if="place" class="guest-card__place">{{ place }}</span>
      </span>
      <span v-if="showWho && initials" class="guest-card__who" aria-hidden="true">{{ initials }}</span>
      <span v-if="seen && !ringing" class="guest-card__seen">
        <i class="pi pi-check-circle" aria-hidden="true" />
        <span class="guest-card__sr">Увидено</span>
      </span>
      <span v-else-if="tag && !ringing" class="guest-card__tag">{{ tag }}</span>
    </span>
    <span v-if="ringing" class="guest-card__hint">
      <i class="pi pi-bell guest-card__bell" aria-hidden="true" />
      <span>Нажмите, чтобы отключить</span>
    </span>
  </component>
</template>

<style lang="sass" scoped>
@use './GuestEventCard'
</style>
