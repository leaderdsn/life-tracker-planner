<script setup lang="ts">
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    error?: string
    busy?: boolean
    minLength?: number
    maxLength?: number
  }>(),
  { error: '', busy: false, minLength: 4, maxLength: 6 },
)

const emit = defineEmits<{
  submit: [pin: string]
  cancel: []
}>()

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const pin = ref('')
const canSubmit = computed(() => pin.value.length >= props.minLength && !props.busy)

function press(digit: string) {
  if (props.busy || pin.value.length >= props.maxLength) return
  pin.value += digit
}

function backspace() {
  pin.value = pin.value.slice(0, -1)
}

function submit() {
  if (canSubmit.value) emit('submit', pin.value)
}

function onKeydown(event: KeyboardEvent) {
  if (/^\d$/.test(event.key)) press(event.key)
  else if (event.key === 'Backspace') backspace()
  else if (event.key === 'Enter') submit()
  else return
  event.preventDefault()
}

defineExpose({ clear: () => (pin.value = '') })
</script>

<template>
  <div class="pin-keypad" tabindex="-1" @keydown="onKeydown">
    <div class="pin-keypad__display" role="img" :aria-label="`Введено цифр: ${pin.length}`">
      <span
        v-for="slot in maxLength"
        :key="slot"
        class="pin-keypad__dot"
        :class="{ 'is-filled': slot <= pin.length }"
      />
    </div>
    <p class="pin-keypad__error" role="alert">{{ error }}</p>

    <div class="pin-keypad__grid">
      <button
        v-for="digit in DIGITS"
        :key="digit"
        type="button"
        class="pin-keypad__key"
        :data-key="digit"
        @click="press(digit)"
      >
        {{ digit }}
      </button>
      <button
        type="button"
        class="pin-keypad__key pin-keypad__key--action"
        data-key="backspace"
        aria-label="Стереть цифру"
        @click="backspace"
      >
        <i class="pi pi-delete-left" aria-hidden="true" />
      </button>
      <button type="button" class="pin-keypad__key" data-key="0" @click="press('0')">0</button>
      <button
        type="button"
        class="pin-keypad__key pin-keypad__key--submit"
        data-key="submit"
        aria-label="Подтвердить"
        :disabled="!canSubmit"
        @click="submit"
      >
        <i class="pi pi-check" aria-hidden="true" />
      </button>
    </div>

    <button type="button" class="pin-keypad__cancel" @click="emit('cancel')">Отмена</button>
  </div>
</template>

<style lang="sass" scoped>
@use './PinKeypad'
</style>
