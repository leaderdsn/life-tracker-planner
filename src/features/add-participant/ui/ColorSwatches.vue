<script setup lang="ts">
import { PASTEL_COLORS } from '@/entities/schedule'

const model = defineModel<string>({ required: true })

const colors: readonly string[] = PASTEL_COLORS
</script>

<template>
  <div class="color-swatches" role="radiogroup" aria-label="Цвет участника">
    <button
      v-for="(color, index) in colors"
      :key="color"
      type="button"
      role="radio"
      class="color-swatches__item"
      :class="{ 'is-selected': model === color }"
      :style="{ background: color }"
      :aria-checked="model === color"
      :aria-label="`Цвет ${index + 1}`"
      @click="model = color"
    >
      <i v-if="model === color" class="pi pi-check" aria-hidden="true" />
    </button>
  </div>
</template>

<style lang="sass" scoped>
@use './ColorSwatches'
</style>
