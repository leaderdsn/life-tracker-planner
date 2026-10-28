<script setup lang="ts">
import { computed } from 'vue'

import { useIsMobile } from './useIsMobile'

defineProps<{
  header: string
  wide?: boolean
}>()

const visible = defineModel<boolean>('visible', { required: true })

const isMobile = useIsMobile()
const position = computed(() => (isMobile.value ? 'bottom' : 'center'))
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="header"
    :position="position"
    :draggable="false"
    :pt="{ root: { class: ['app-dialog', { 'app-dialog--sheet': isMobile, 'app-dialog--wide': wide }] } }"
    modal
    dismissable-mask
    block-scroll
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </Dialog>
</template>

<style lang="sass">
@use './AppDialog'
</style>
