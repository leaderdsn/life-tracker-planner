<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from 'vue'

import { EventForm, initialOf, PASTEL_COLORS, useScheduleStore, WEEKDAY_SHORT } from '@/entities/schedule'
import type { NewEvent } from '@/entities/schedule'
import { AppDialog } from '@/shared/ui'

import ColorSwatches from './ColorSwatches.vue'

const emit = defineEmits<{
  created: [participantId: string]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const PLACEHOLDER_ID = 'new-participant'

const store = useScheduleStore()
const form = useTemplateRef<InstanceType<typeof EventForm>>('form')

const step = ref<1 | 2>(1)
const name = ref('')
const color = ref<string>(PASTEL_COLORS[0] ?? '#cdb4db')
const nameError = ref('')
const pending = ref<NewEvent[]>([])

const header = computed(() => (step.value === 1 ? 'Новый участник' : `Занятия: ${name.value.trim()}`))
const previewInitial = computed(() => initialOf(name.value) || '?')

watch(visible, (open) => {
  if (!open) return
  step.value = 1
  name.value = ''
  color.value = PASTEL_COLORS[store.participants.length % PASTEL_COLORS.length] ?? color.value
  nameError.value = ''
  pending.value = []
})

function toStepTwo() {
  if (!name.value.trim()) {
    nameError.value = 'Как зовут участника?'
    return
  }
  nameError.value = ''
  step.value = 2
}

function addToList(events: NewEvent[]) {
  pending.value.push(...events)
}

function describe(event: NewEvent): string {
  const when = event.day ? WEEKDAY_SHORT[event.day] : (event.date ?? '')
  const time = event.end ? `${event.start}–${event.end}` : event.start
  return `${when} · ${time}`
}

function finish() {
  if (form.value && !form.value.isBlank() && !form.value.submit()) return
  const participant = store.addParticipant({ name: name.value.trim(), color: color.value })
  if (pending.value.length > 0) {
    store.addEvents(pending.value.map((event) => ({ ...event, participantIds: [participant.id] })))
  }
  visible.value = false
  emit('created', participant.id)
}
</script>

<template>
  <AppDialog v-model:visible="visible" :header="header" wide>
    <form v-if="step === 1" class="add-participant" novalidate @submit.prevent="toStepTwo">
      <div class="add-participant__field">
        <label class="add-participant__label" for="participant-name">Имя</label>
        <InputText
          id="participant-name"
          v-model="name"
          autocomplete="off"
          placeholder="Например, Руслан"
          :invalid="Boolean(nameError)"
          autofocus
          fluid
        />
        <p v-if="nameError" class="add-participant__error" role="alert">{{ nameError }}</p>
      </div>

      <div class="add-participant__field">
        <span class="add-participant__label">Цвет</span>
        <ColorSwatches v-model="color" />
      </div>

      <div class="add-participant__preview" aria-label="Так будет выглядеть метка">
        <span class="add-participant__chip" :style="{ background: color }">
          <span class="add-participant__initial" aria-hidden="true">{{ previewInitial }}</span>
          {{ name.trim() || 'Имя участника' }}
        </span>
      </div>

      <Button type="submit" label="Дальше" icon="pi pi-arrow-right" icon-pos="right" fluid />
    </form>

    <div v-else class="add-participant">
      <p class="add-participant__hint">Добавьте занятия или пропустите этот шаг: их можно добавить позже.</p>

      <EventForm
        ref="form"
        :participant-ids="[PLACEHOLDER_ID]"
        submit-label="Добавить в список"
        @submit="addToList"
      />

      <section v-if="pending.length > 0" class="add-participant__list" aria-label="Добавленные занятия">
        <h3 class="add-participant__list-title">В списке: {{ pending.length }}</h3>
        <ul>
          <li v-for="(event, index) in pending" :key="index">
            <span class="add-participant__list-title-text">{{ event.title }}</span>
            <span class="add-participant__list-meta">{{ describe(event) }}</span>
            <Button
              icon="pi pi-times"
              severity="secondary"
              variant="text"
              rounded
              :aria-label="`Убрать «${event.title}» из списка`"
              @click="pending.splice(index, 1)"
            />
          </li>
        </ul>
      </section>
    </div>

    <template v-if="step === 2" #footer>
      <Button label="Назад" severity="secondary" variant="text" icon="pi pi-arrow-left" @click="step = 1" />
      <Button
        :label="pending.length > 0 ? 'Готово' : 'Пропустить и закончить'"
        icon="pi pi-check"
        @click="finish"
      />
    </template>
  </AppDialog>
</template>

<style lang="sass" scoped>
@use './AddParticipantDialog'
</style>
