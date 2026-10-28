<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useTemplateRef } from 'vue'

import { useScheduleStore } from '@/entities/schedule'
import { useUndoToast } from '@/shared/ui'
import { toIsoDate } from '@/shared/lib'

const store = useScheduleStore()
const confirm = useConfirm()
const toast = useToast()
const undoToast = useUndoToast()
const fileInput = useTemplateRef<HTMLInputElement>('file')

function download() {
  const blob = new Blob([store.exportJson()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `raspisanie-${toIsoDate(new Date())}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    store.importJson(await file.text())
    undoToast.show('Расписание загружено из файла')
  } catch (e) {
    toast.add({
      severity: 'error',
      summary: 'Не удалось загрузить файл',
      detail: e instanceof Error ? e.message : 'Проверьте, что это резервная копия расписания.',
      life: 6000,
    })
  }
}

function askReset() {
  confirm.require({
    header: 'Вернуть исходное расписание?',
    message: 'Все ваши изменения и отметки будут заменены исходными данными. Сразу после этого можно отменить.',
    icon: 'pi pi-refresh',
    acceptLabel: 'Вернуть',
    rejectLabel: 'Не надо',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', variant: 'text' },
    accept: () => {
      store.resetToSeed()
      undoToast.show('Исходное расписание восстановлено')
    },
  })
}
</script>

<template>
  <div class="import-export">
    <p class="import-export__text">Все данные хранятся только в этом браузере. Сохраните копию, чтобы не потерять их.</p>
    <div class="import-export__actions">
      <Button label="Скачать копию" icon="pi pi-download" severity="secondary" @click="download" />
      <Button label="Загрузить из файла" icon="pi pi-upload" severity="secondary" @click="fileInput?.click()" />
      <Button label="Исходное расписание" icon="pi pi-refresh" severity="secondary" variant="text" @click="askReset" />
    </div>
    <input ref="file" class="import-export__file" type="file" accept="application/json,.json" tabindex="-1" @change="onFile">
  </div>
</template>

<style lang="sass" scoped>
@use './ImportExportPanel'
</style>
