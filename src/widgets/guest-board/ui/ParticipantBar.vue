<script setup lang="ts">
import type { Participant } from '@/entities/schedule'
import { Avatar } from '@/shared/ui'

defineProps<{
  participants: Participant[]
  /** participant id or 'all' */
  selected: string
  labels: Record<string, string>
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <nav class="participant-bar" aria-label="Участники">
    <button
      type="button"
      class="participant-bar__pill"
      :class="{ 'is-active': selected === 'all' }"
      :aria-pressed="selected === 'all'"
      @click="emit('select', 'all')"
    >
      Все
    </button>
    <button
      v-for="p in participants"
      :key="p.id"
      type="button"
      class="participant-bar__pill"
      :class="{ 'is-active': selected === p.id }"
      :aria-pressed="selected === p.id"
      @click="emit('select', p.id)"
    >
      <Avatar :name="p.name" :color="p.color" :src="p.avatar" :label="labels[p.id]" size="md" />
      {{ p.name }}
    </button>
  </nav>
</template>

<style lang="sass" scoped>
@use './ParticipantBar'
</style>
