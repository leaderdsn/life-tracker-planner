<script setup lang="ts">
defineProps<{
  text: string
  /** Sample is decorative: hidden from assistive tech and not interactive. */
  decorative?: boolean
  stack?: boolean
}>()
</script>

<template>
  <li class="legend-row" :class="{ 'legend-row--stack': stack }">
    <span class="legend-row__sample" :aria-hidden="decorative || undefined" :inert="decorative || undefined">
      <slot />
    </span>
    <span class="legend-row__text" :title="text">{{ text }}</span>
  </li>
</template>

<style lang="sass" scoped>
@use './LegendRow'
</style>
