<script setup lang="ts">
import { computed } from 'vue'

import { WEEKDAY_SHORT } from '@/entities/schedule'
import type { ImportMode, ImportSummary, ParsedImport, Participant } from '@/entities/schedule'
import { AppDialog } from '@/shared/ui'

const props = defineProps<{
  fileName: string
  parsed: ParsedImport
  existing: Participant[]
  summaries: Record<ImportMode, ImportSummary>
}>()

const emit = defineEmits<{
  apply: [mode: ImportMode]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const PREVIEW_ROWS = 10

const nameOf = computed(() => {
  const byId = new Map([...props.existing, ...props.parsed.participants].map((p) => [p.id, p.name]))
  return (ids: string[]) => ids.map((id) => byId.get(id) ?? id).join(', ')
})

const rows = computed(() =>
  props.parsed.events.slice(0, PREVIEW_ROWS).map((e) => ({
    who: nameOf.value(e.participantIds),
    when: e.date ? e.date.split('-').reverse().join('.') : e.day ? WEEKDAY_SHORT[e.day] : '',
    time: e.end ? `${e.start}–${e.end}` : e.start,
    title: e.title,
    place: e.place ?? '',
    review: e.needsReview ?? '',
  })),
)
const rest = computed(() => Math.max(0, props.parsed.events.length - PREVIEW_ROWS))
const newNames = computed(() => props.parsed.participants.map((p) => p.name).join(', '))
const duplicates = computed(() => props.summaries.merge.skipped)
const empty = computed(() => props.parsed.events.length === 0)
</script>

<template>
  <AppDialog v-model:visible="visible" header="Загрузка расписания" wide>
    <div class="import-preview">
      <p class="import-preview__file">{{ fileName }}</p>

      <ul class="import-preview__counts" aria-label="Что нашлось в файле">
        <li class="import-preview__count">
          <strong data-test="events">{{ parsed.events.length }}</strong>
          <span>занятий</span>
        </li>
        <li class="import-preview__count">
          <strong data-test="participants">{{ parsed.participants.length }}</strong>
          <span>новых участников</span>
        </li>
        <li class="import-preview__count" :class="{ 'is-error': parsed.errors.length > 0 }">
          <strong data-test="errors">{{ parsed.errors.length }}</strong>
          <span>с ошибками</span>
        </li>
      </ul>

      <p v-if="newNames" class="import-preview__note">Новые участники: {{ newNames }}</p>
      <p v-if="duplicates > 0" class="import-preview__note">
        При добавлении к текущему {{ duplicates }} повторов будут пропущены.
      </p>

      <div v-if="rows.length" class="import-preview__scroll" tabindex="0" role="region" aria-label="Первые строки файла">
        <table class="import-preview__table">
          <thead>
            <tr>
              <th scope="col">Кто</th>
              <th scope="col">Когда</th>
              <th scope="col">Время</th>
              <th scope="col">Занятие</th>
              <th scope="col">Место</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rows" :key="i">
              <td>{{ row.who }}</td>
              <td>{{ row.when }}</td>
              <td>{{ row.time }}</td>
              <td>
                {{ row.title }}
                <i v-if="row.review" class="pi pi-question-circle" :title="row.review" :aria-label="`Проверьте: ${row.review}`" />
              </td>
              <td>{{ row.place }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="rest > 0" class="import-preview__note">…и ещё {{ rest }}</p>

      <section v-if="parsed.errors.length" class="import-preview__errors" aria-labelledby="import-errors">
        <h3 id="import-errors" class="import-preview__heading">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          Эти строки не загрузятся
        </h3>
        <ul class="import-preview__error-list">
          <li v-for="error in parsed.errors" :key="`${error.row}-${error.message}`">
            <b>Строка {{ error.row }}:</b> {{ error.message }}
          </li>
        </ul>
      </section>

      <p v-if="empty" class="import-preview__empty" role="status">В файле не нашлось занятий для загрузки.</p>
    </div>

    <template #footer>
      <div class="import-preview__footer">
        <Button
          label="Заменить расписание"
          icon="pi pi-sync"
          :disabled="empty"
          data-test="replace"
          @click="emit('apply', 'replace')"
        />
        <Button
          label="Добавить к текущему"
          icon="pi pi-plus"
          severity="secondary"
          :disabled="empty"
          data-test="merge"
          @click="emit('apply', 'merge')"
        />
        <Button label="Отмена" severity="secondary" variant="text" data-test="cancel" @click="visible = false" />
      </div>
    </template>
  </AppDialog>
</template>

<style lang="sass">
@use './ImportPreviewDialog'
</style>
