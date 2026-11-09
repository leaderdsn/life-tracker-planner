<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { normalizeHex, readableInk } from '@/shared/lib'

import { COLOR_NAMES, PASTEL_COLORS } from '../config'

const model = defineModel<string>({ required: true })

const colors: readonly string[] = PASTEL_COLORS

const isPreset = computed(() => colors.some((c) => c.toLowerCase() === model.value.toLowerCase()))
const customHex = computed(() => normalizeHex(model.value) ?? '#ffffff')
const hexText = ref(isPreset.value ? '' : model.value)
const hexError = ref(false)

watch(model, (value) => {
  if (normalizeHex(hexText.value) !== normalizeHex(value)) hexText.value = isPreset.value ? '' : value
  hexError.value = false
})

function pick(value: string): void {
  const hex = normalizeHex(value)
  if (hex) model.value = hex
}

function commitText(): void {
  if (hexText.value.trim() === '') {
    hexError.value = false
    return
  }
  const hex = normalizeHex(hexText.value)
  hexError.value = hex === null
  if (hex) {
    model.value = hex
    hexText.value = hex
  }
}
</script>

<template>
  <div class="color-swatches-field">
    <div class="color-swatches" role="radiogroup" aria-label="Цвет участника">
      <button
        v-for="(color, index) in colors"
        :key="color"
        type="button"
        role="radio"
        class="color-swatches__item"
        :class="{ 'is-selected': model.toLowerCase() === color.toLowerCase() }"
        :style="{ background: color }"
        :aria-checked="model.toLowerCase() === color.toLowerCase()"
        :title="COLOR_NAMES[color]"
        :aria-label="`Цвет: ${COLOR_NAMES[color] ?? index + 1}`"
        @click="model = color"
      >
        <i v-if="model.toLowerCase() === color.toLowerCase()" class="pi pi-check" aria-hidden="true" />
      </button>
      <label
        class="color-swatches__item color-swatches__custom"
        :class="{ 'is-selected': !isPreset, 'is-custom': !isPreset }"
        :style="!isPreset ? { background: customHex, '--swatch-ink': readableInk(customHex) } : undefined"
        title="Свой цвет"
      >
        <input
          class="color-swatches__native"
          type="color"
          :value="customHex"
          aria-label="Выбрать свой цвет"
          @input="pick(($event.target as HTMLInputElement).value)"
        >
        <i :class="isPreset ? 'pi pi-palette' : 'pi pi-check'" aria-hidden="true" />
      </label>
    </div>
    <label class="color-swatches__hex">
      <span>Свой цвет, HEX</span>
      <input
        v-model="hexText"
        type="text"
        inputmode="text"
        autocomplete="off"
        spellcheck="false"
        maxlength="7"
        placeholder="#A1B2C3"
        :aria-invalid="hexError"
        aria-describedby="color-hex-error"
        @change="commitText"
        @keydown.enter.prevent="commitText"
      >
    </label>
    <p v-if="hexError" id="color-hex-error" class="color-swatches__error" role="alert">Цвет в формате #A1B2C3</p>
  </div>
</template>

<style lang="sass" scoped>
@use './ColorSwatches'
</style>
