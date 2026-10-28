<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

import { UNDO_TOAST_GROUP } from './useUndoToast'

const emit = defineEmits<{
  undo: []
}>()

const toast = useToast()

function undo() {
  emit('undo')
  toast.removeGroup(UNDO_TOAST_GROUP)
}
</script>

<template>
  <Toast :group="UNDO_TOAST_GROUP" position="bottom-center">
    <template #message="{ message }">
      <div class="undo-toast">
        <span class="undo-toast__text">{{ message.summary }}</span>
        <Button label="Отменить" icon="pi pi-undo" size="small" severity="secondary" @click="undo" />
      </div>
    </template>
  </Toast>
</template>

<style lang="sass" scoped>
@use './UndoToast'
</style>
