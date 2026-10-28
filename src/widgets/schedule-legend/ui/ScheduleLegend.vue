<script setup lang="ts">
import { useLegendCollapsed } from '../model/useLegendCollapsed'
import LegendContent from './LegendContent.vue'

const { collapsed, toggle } = useLegendCollapsed()
</script>

<template>
  <aside class="schedule-legend" :class="{ 'is-collapsed': collapsed }" aria-labelledby="legend-title">
    <header class="schedule-legend__head">
      <h2 id="legend-title" class="schedule-legend__title">Обозначения</h2>
      <Button
        :label="collapsed ? 'Показать' : 'Скрыть'"
        :icon="collapsed ? 'pi pi-angle-double-left' : 'pi pi-angle-double-right'"
        :aria-expanded="!collapsed"
        severity="secondary"
        variant="text"
        size="small"
        @click="toggle"
      />
    </header>
    <div v-show="!collapsed" class="schedule-legend__body">
      <LegendContent />
    </div>
  </aside>
</template>

<style lang="sass" scoped>
@use './ScheduleLegend'
</style>
