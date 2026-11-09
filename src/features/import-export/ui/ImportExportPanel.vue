<script setup lang="ts">
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { computed, ref, useTemplateRef } from 'vue'

import { canEdit, planImport, readSpreadsheet, rowsToEvents, useDeviceStore, useScheduleStore, writeSpreadsheet } from '@/entities/schedule'
import type { ImportMode, ImportSummary, ParsedImport, SpreadsheetFormat } from '@/entities/schedule'
import { useUndoToast } from '@/shared/ui'

import { fileName, saveBlob } from '../model/download'
import ImportPreviewDialog from './ImportPreviewDialog.vue'

const ACCEPT = '.json,.xlsx,.xls,.csv,application/json'

const store = useScheduleStore()
const device = useDeviceStore()
const confirm = useConfirm()
const toast = useToast()
const undoToast = useUndoToast()
const fileInput = useTemplateRef<HTMLInputElement>('file')
const exportMenu = useTemplateRef<{ toggle: (event: Event) => void }>('menu')

const busy = ref<'import' | 'export' | null>(null)
const previewOpen = ref(false)
const pending = ref<{ name: string; parsed: ParsedImport; summaries: Record<ImportMode, ImportSummary> } | null>(null)
const isAdmin = computed(() => canEdit(device.role))

const current = () => ({ participants: store.participants, events: store.events, completions: store.completions })

function fail(summary: string, e: unknown, fallback: string) {
  toast.add({ severity: 'error', summary, detail: e instanceof Error ? e.message : fallback, life: 6000 })
}

async function exportAs(format: 'json' | SpreadsheetFormat) {
  try {
    busy.value = 'export'
    if (format === 'json') {
      saveBlob(new Blob([store.exportJson()], { type: 'application/json' }), fileName('json'))
    } else {
      saveBlob(await writeSpreadsheet({ events: store.events, participants: store.participants }, format), fileName(format))
    }
  } catch (e) {
    fail('Не удалось сохранить файл', e, 'Попробуйте ещё раз.')
  } finally {
    busy.value = null
  }
}

const templateUrl = `${import.meta.env.BASE_URL}templates/raspisanie-shablon.xlsx`

const menuItems = [
  { label: 'JSON (полная копия)', icon: 'pi pi-file', command: () => exportAs('json') },
  { label: 'Excel (.xlsx)', icon: 'pi pi-file-excel', command: () => exportAs('xlsx') },
  { label: 'Excel 97–2003 (.xls)', icon: 'pi pi-file-excel', command: () => exportAs('xls') },
  { label: 'CSV', icon: 'pi pi-table', command: () => exportAs('csv') },
]

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !isAdmin.value) return
  if (/.json$/i.test(file.name)) {
    try {
      store.importJson(await file.text())
      undoToast.show('Расписание загружено из файла')
    } catch (e) {
      fail('Не удалось загрузить файл', e, 'Проверьте, что это резервная копия расписания.')
    }
    return
  }
  busy.value = 'import'
  try {
    const parsed = rowsToEvents(await readSpreadsheet(file, file.name), store.participants)
    pending.value = {
      name: file.name,
      parsed,
      summaries: {
        replace: planImport(current(), parsed, 'replace').summary,
        merge: planImport(current(), parsed, 'merge').summary,
      },
    }
    previewOpen.value = true
  } catch (e) {
    fail('Не удалось прочитать таблицу', e, 'Проверьте формат файла.')
  } finally {
    busy.value = null
  }
}

function applyImport(mode: ImportMode) {
  if (!pending.value) return
  try {
    const plan = planImport(current(), pending.value.parsed, mode)
    store.applyImport(plan)
    previewOpen.value = false
    undoToast.show(
      mode === 'replace' ? `Расписание заменено: ${plan.summary.added} занятий` : `Добавлено занятий: ${plan.summary.added}`,
    )
  } catch (e) {
    fail('Не удалось загрузить расписание', e, 'Попробуйте ещё раз.')
  }
}

function askClear() {
  confirm.require({
    header: 'Очистить расписание?',
    message: 'Все участники и занятия будут удалены. Действие можно отменить сразу после очистки.',
    icon: 'pi pi-trash',
    acceptLabel: 'Очистить',
    rejectLabel: 'Не надо',
    acceptProps: { severity: 'danger' },
    rejectProps: { severity: 'secondary', variant: 'text' },
    accept: () => {
      store.clearSchedule()
      undoToast.show('Расписание очищено')
    },
  })
}
</script>

<template>
  <div class="import-export">
    <p class="import-export__text">Все данные хранятся только в этом браузере. Сохраните копию, чтобы не потерять их.</p>
    <div class="import-export__actions">
      <Button
        label="Скачать"
        icon="pi pi-download"
        severity="secondary"
        aria-haspopup="menu"
        :loading="busy === 'export'"
        @click="exportMenu?.toggle($event)"
      />
      <Menu ref="menu" :model="menuItems" popup />
      <Button
        v-if="isAdmin"
        label="Загрузить из файла"
        icon="pi pi-upload"
        severity="secondary"
        :loading="busy === 'import'"
        @click="fileInput?.click()"
      />
      <Button label="Очистить расписание" icon="pi pi-trash" severity="secondary" variant="text" @click="askClear" />
    </div>
    <p v-if="isAdmin" class="import-export__hint">
      Таблица (Excel или CSV): по строке на занятие. Столбцы: Участники, День, Дата, Начало, Окончание, Занятие, Место,
      Категория, Напоминание, Во «Все», Заметка.
      <a class="import-export__link" :href="templateUrl" download="raspisanie-shablon.xlsx">Скачать шаблон</a>
    </p>
    <p v-if="busy === 'import'" class="import-export__hint" role="status">Читаю таблицу…</p>
    <input ref="file" class="import-export__file" type="file" :accept="ACCEPT" tabindex="-1" @change="onFile">
    <ImportPreviewDialog
      v-if="pending"
      v-model:visible="previewOpen"
      :file-name="pending.name"
      :parsed="pending.parsed"
      :existing="store.participants"
      :summaries="pending.summaries"
      @apply="applyImport"
    />
  </div>
</template>

<style lang="sass" scoped>
@use './ImportExportPanel'
</style>
