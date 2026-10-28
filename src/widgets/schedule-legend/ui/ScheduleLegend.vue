<script setup lang="ts">
import { computed } from 'vue'

import { useLegendCollapsed } from '../model/useLegendCollapsed'
import LegendContent from './LegendContent.vue'

const { collapsed, toggle } = useLegendCollapsed()
const label = computed(() => (collapsed.value ? 'Показать обозначения' : 'Скрыть обозначения'))
</script>

<template>
  <aside class="schedule-legend" :class="{ 'is-collapsed': collapsed }" aria-labelledby="legend-title">
    <header class="schedule-legend__head">
      <h2 id="legend-title" class="schedule-legend__title" :class="{ 'is-hidden': collapsed }">Обозначения</h2>
      <button
        type="button"
        class="schedule-legend__toggle"
        :title="label"
        :aria-label="label"
        :aria-expanded="!collapsed"
        aria-controls="legend-body"
        @click="toggle"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <path d="M15 4v16" />
          <path v-if="!collapsed" d="M8.5 9.5 11 12l-2.5 2.5" stroke-linecap="round" stroke-linejoin="round" />
          <path v-else d="M11 9.5 8.5 12l2.5 2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </header>
    <div v-show="!collapsed" id="legend-body" class="schedule-legend__body">
      <LegendContent />
    </div>
  </aside>
</template>

<style lang="sass" scoped>
@use './ScheduleLegend'
</style>
