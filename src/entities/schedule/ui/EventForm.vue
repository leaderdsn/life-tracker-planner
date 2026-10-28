<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'

import { parseIsoDate, toIsoDate } from '@/shared/lib'
import { useIsMobile } from '@/shared/ui'

import { CATEGORY_LABELS, REMIND_OPTIONS, WEEKDAYS, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../config'
import { ValidationError } from '../lib'
import { useScheduleStore } from '../model/scheduleStore'
import { createDraft, draftToEvents, eventToDraft, toggleDay, WORKDAYS } from './eventDraft'
import TimeInput from './TimeInput.vue'

import type { EventDraft, NewEvent } from './eventDraft'
import type { EventCategory, ScheduleEvent, Weekday } from '../model/types'

const props = defineProps<{
  participantIds: string[]
  initial?: ScheduleEvent
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [events: NewEvent[]]
}>()

const uid = useId()
const store = useScheduleStore()
const isMobile = useIsMobile()

const draft = ref<EventDraft>(props.initial ? eventToDraft(props.initial) : createDraft())
const error = ref<{ field: string; message: string } | null>(null)
const suggestions = ref<string[]>([])

const editing = computed(() => Boolean(props.initial))

const remindOptions = [
  { label: 'Как в настройках', value: null },
  ...REMIND_OPTIONS.map((value) => ({ label: value === 0 ? 'В момент начала' : `За ${value} мин`, value })),
]
const categoryOptions = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
  value: value as EventCategory,
  label,
}))

const dateModel = computed({
  get: () => (draft.value.date ? parseIsoDate(draft.value.date) : null),
  set: (value: Date | null) => {
    draft.value.date = value ? toIsoDate(value) : null
  },
})

const allWeekSelected = computed(() => draft.value.days.length === WEEKDAYS.length)
const workdaysSelected = computed(
  () => draft.value.days.length === WORKDAYS.length && WORKDAYS.every((d) => draft.value.days.includes(d)),
)

watch(
  () => props.initial,
  (event) => {
    draft.value = event ? eventToDraft(event) : createDraft()
    error.value = null
  },
)

function search(query: string) {
  const needle = query.trim().toLowerCase()
  suggestions.value = store.titles.filter((t) => t.toLowerCase().includes(needle)).slice(0, 8)
}

function pickDay(day: Weekday) {
  draft.value.days = editing.value ? [day] : toggleDay(draft.value.days, day)
}

function isBlank() {
  return !draft.value.title.trim() && !draft.value.start.trim()
}

function submit(): boolean {
  try {
    const events = draftToEvents(draft.value, props.participantIds, props.initial)
    error.value = null
    emit('submit', events)
    if (!editing.value) {
      draft.value = createDraft({
        days: draft.value.days,
        oneOff: draft.value.oneOff,
        date: draft.value.date,
        remindBefore: draft.value.remindBefore,
        category: draft.value.category,
      })
    }
    return true
  } catch (e) {
    if (!(e instanceof ValidationError)) throw e
    error.value = { field: e.field, message: e.message }
    return false
  }
}

defineExpose({ submit, isBlank })
</script>

<template>
  <form class="event-form" novalidate @submit.prevent="submit">
    <div class="event-form__field">
      <label class="event-form__label" :for="`${uid}-title`">Название</label>
      <AutoComplete
        v-model="draft.title"
        :input-id="`${uid}-title`"
        :suggestions="suggestions"
        :invalid="error?.field === 'title'"
        placeholder="Например, Вокал"
        fluid
        @complete="search($event.query)"
      />
    </div>

    <fieldset v-if="!draft.oneOff" class="event-form__field event-form__fieldset">
      <legend class="event-form__label">Дни недели</legend>
      <div class="event-form__days">
        <button
          v-for="day in WEEKDAYS"
          :key="day"
          type="button"
          class="event-form__day"
          :class="{ 'is-on': draft.days.includes(day) }"
          :aria-pressed="draft.days.includes(day)"
          :aria-label="WEEKDAY_NAMES[day]"
          @click="pickDay(day)"
        >
          {{ WEEKDAY_SHORT[day] }}
        </button>
      </div>
      <div v-if="!editing" class="event-form__quick">
        <button
          type="button"
          class="event-form__quick-btn"
          :aria-pressed="workdaysSelected"
          @click="draft.days = [...WORKDAYS]"
        >
          Будни
        </button>
        <button
          type="button"
          class="event-form__quick-btn"
          :aria-pressed="allWeekSelected"
          @click="draft.days = [...WEEKDAYS]"
        >
          Каждый день
        </button>
      </div>
    </fieldset>

    <div class="event-form__oneoff">
      <ToggleSwitch v-model="draft.oneOff" :input-id="`${uid}-oneoff`" />
      <label :for="`${uid}-oneoff`">Разовое, на конкретную дату</label>
    </div>

    <div v-if="draft.oneOff" class="event-form__field">
      <label class="event-form__label" :for="`${uid}-date`">Дата</label>
      <DatePicker
        v-model="dateModel"
        :input-id="`${uid}-date`"
        :invalid="error?.field === 'date'"
        :touch-ui="isMobile"
        date-format="dd.mm.yy"
        :manual-input="false"
        placeholder="Выберите дату"
        show-icon
        fluid
      />
    </div>

    <div class="event-form__times">
      <TimeInput :id="`${uid}-start`" v-model="draft.start" label="Начало" />
      <TimeInput :id="`${uid}-end`" v-model="draft.end" label="Окончание" optional />
    </div>

    <div class="event-form__field">
      <label class="event-form__label" :for="`${uid}-place`">Место</label>
      <InputText :id="`${uid}-place`" v-model="draft.place" placeholder="Необязательно" fluid />
    </div>

    <div class="event-form__times">
      <div class="event-form__field">
        <label class="event-form__label" :for="`${uid}-remind`">Напоминание</label>
        <Select
          v-model="draft.remindBefore"
          :input-id="`${uid}-remind`"
          :options="remindOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>
      <div class="event-form__field">
        <label class="event-form__label" :for="`${uid}-category`">Тип</label>
        <Select
          v-model="draft.category"
          :input-id="`${uid}-category`"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>
    </div>

    <p v-if="error" class="event-form__error" role="alert">
      <i class="pi pi-exclamation-circle" aria-hidden="true" />
      {{ error.message }}
    </p>

    <Button type="submit" :label="submitLabel" :icon="editing ? 'pi pi-check' : 'pi pi-plus'" fluid />
  </form>
</template>

<style lang="sass" scoped>
@use './EventForm'
</style>
