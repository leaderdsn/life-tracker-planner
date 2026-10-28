<script setup lang="ts">
import { ref } from 'vue'

import { AppDialog, useIsMobile } from '@/shared/ui'

import LegendContent from './LegendContent.vue'

const isMobile = useIsMobile()
const popover = ref<{ toggle: (event: Event) => void } | null>(null)
const sheetOpen = ref(false)

function open(event: Event) {
  if (isMobile.value) sheetOpen.value = true
  else popover.value?.toggle(event)
}
</script>

<template>
  <div class="legend-button">
    <Button label="Обозначения" icon="pi pi-info-circle" severity="secondary" size="small" aria-haspopup="dialog" @click="open" />

    <Popover ref="popover" :pt="{ root: { class: 'legend-popover' } }">
      <div class="legend-popover__body">
        <h2 class="legend-popover__title">Обозначения</h2>
        <LegendContent />
      </div>
    </Popover>

    <AppDialog v-model:visible="sheetOpen" header="Обозначения">
      <LegendContent />
    </AppDialog>
  </div>
</template>

<style lang="sass" scoped>
@use './LegendButton'
</style>

<style lang="sass">
@use './LegendPopover'
</style>
