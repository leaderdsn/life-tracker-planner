<script setup lang="ts">
import { computed } from 'vue'

import { EventForm, useScheduleStore } from '@/entities/schedule'
import type { NewEvent } from '@/entities/schedule'
import { AppDialog, useUndoToast } from '@/shared/ui'

const props = defineProps<{
  /** null while creating a new event */
  eventId: string | null
  /** owners of a newly created event */
  participantIds: string[]
}>()

const visible = defineModel<boolean>('visible', { required: true })

const store = useScheduleStore()
const undoToast = useUndoToast()

const event = computed(() => (props.eventId ? store.events.find((e) => e.id === props.eventId) : undefined))
const creating = computed(() => !props.eventId)
const owners = computed(() => event.value?.participantIds ?? props.participantIds)

function save(events: NewEvent[]) {
  if (event.value) {
    const [first] = events
    if (first) {
      store.updateEvent(event.value.id, {
        day: undefined,
        date: undefined,
        end: undefined,
        place: undefined,
        remindBefore: undefined,
        ...first,
      })
    }
  } else {
    store.addEvents(events)
  }
  visible.value = false
}

function remove() {
  if (!event.value) return
  const title = event.value.title
  store.removeEvent(event.value.id)
  visible.value = false
  undoToast.show(`«${title}» удалено`)
}

function confirmEvent() {
  if (!event.value) return
  store.confirmEvent(event.value.id)
  visible.value = false
}
</script>

<template>
  <AppDialog v-model:visible="visible" :header="creating ? 'Новое занятие' : 'Занятие'" wide>
    <div v-if="creating || event" class="edit-event">
      <div v-if="event?.needsReview" class="edit-event__review" role="note">
        <i class="pi pi-question-circle" aria-hidden="true" />
        <p>{{ event.needsReview }}</p>
        <Button label="Подтвердить" icon="pi pi-check" size="small" severity="secondary" @click="confirmEvent" />
      </div>

      <EventForm
        :participant-ids="owners"
        :initial="event"
        :submit-label="creating ? 'Добавить' : 'Сохранить'"
        @submit="save"
      />

      <p v-if="event && event.participantIds.length > 1" class="edit-event__note">
        Это общее занятие: изменения увидят все участники.
      </p>

      <Button
        v-if="event"
        label="Удалить занятие"
        icon="pi pi-trash"
        severity="danger"
        variant="text"
        fluid
        @click="remove"
      />
    </div>
  </AppDialog>
</template>

<style lang="sass" scoped>
@use './EditEventDialog'
</style>
