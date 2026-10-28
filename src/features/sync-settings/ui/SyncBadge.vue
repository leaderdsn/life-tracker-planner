<script setup lang="ts">
import { computed } from 'vue'

import { useSyncStore } from '@/entities/schedule'

defineProps<{
  /** dot only, label stays available to screen readers */
  compact?: boolean
}>()

const LABELS = {
  off: 'Без синхронизации',
  connecting: 'Подключение',
  online: 'На связи',
  offline: 'Нет связи',
} as const

const sync = useSyncStore()
const label = computed(() => LABELS[sync.status])
</script>

<template>
  <span class="sync-badge" :class="`is-${sync.status}`" role="status" :title="label">
    <span class="sync-badge__dot" aria-hidden="true" />
    <span class="sync-badge__label" :class="{ 'is-hidden': compact }">{{ label }}</span>
  </span>
</template>

<style lang="sass" scoped>
@use './SyncBadge'
</style>
