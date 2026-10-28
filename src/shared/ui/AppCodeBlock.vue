<script setup lang="ts">
import { computed } from 'vue'

import { useClipboard } from '../lib'

const { code, prompt = '$' } = defineProps<{
  code: string
  prompt?: string
}>()

const { copied, copy } = useClipboard()

const copyLabel = computed(() => (copied.value ? 'Скопировано' : 'Скопировать'))
</script>

<template>
  <div class="app-code-block">
    <code class="app-code-block__code">
      <span class="app-code-block__prompt" aria-hidden="true">{{ prompt }}</span>{{ code }}
    </code>
    <Button
      :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
      :aria-label="copyLabel"
      :title="copyLabel"
      severity="secondary"
      variant="text"
      size="small"
      rounded
      @click="copy(code)"
    />
  </div>
</template>

<style lang="sass" scoped>
@use './AppCodeBlock'
</style>
