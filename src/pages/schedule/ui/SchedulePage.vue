<script setup lang="ts">
import { computed, ref } from 'vue'

import { canEdit, useDeviceStore, useScheduleStore } from '@/entities/schedule'
import { AddParticipantDialog } from '@/features/add-participant'
import { EditEventDialog } from '@/features/edit-event'
import { EditParticipantDialog, MySettingsDialog } from '@/features/participant-profile'
import { RemoveParticipantButton } from '@/features/remove-participant'
import { AppHeader } from '@/widgets/app-header'
import { ProgressPanel } from '@/widgets/progress-panel'
import { RingingPanel } from '@/widgets/ringing-panel'
import { LegendButton, ScheduleLegend, useLegendCollapsed } from '@/widgets/schedule-legend'
import { ScheduleDay } from '@/widgets/schedule-day'
import { ScheduleMonth } from '@/widgets/schedule-month'
import { ScheduleWeek } from '@/widgets/schedule-week'
import { ViewToolbar } from '@/widgets/view-toolbar'

import { useScheduleRoute } from '../model/useScheduleRoute'
import SettingsDialog from './SettingsDialog.vue'

const store = useScheduleStore()
const device = useDeviceStore()
const isAdmin = computed(() => canEdit(device.role))
const { collapsed: legendCollapsed } = useLegendCollapsed()
const { participantId, view, anchor, setView, today, openDay, step, goToParticipant } = useScheduleRoute()

const addOpen = ref(false)
const settingsOpen = ref(false)
const editOpen = ref(false)
const editEventId = ref<string | null>(null)
const profileOpen = ref(false)

const personal = computed(() => (participantId.value === 'all' ? null : store.participantById(participantId.value)))

function openEvent(id: string) {
  if (!isAdmin.value) return
  editEventId.value = id
  editOpen.value = true
}

function openCreate() {
  if (!isAdmin.value) return
  editEventId.value = null
  editOpen.value = true
}
</script>

<template>
  <AppHeader @add-participant="addOpen = true" @open-settings="settingsOpen = true" />

  <main class="schedule-page" :class="{ 'is-legend-collapsed': legendCollapsed }">
    <div class="schedule-page__content">
      <RingingPanel v-if="isAdmin" />

      <ViewToolbar :view="view" :anchor="anchor" @update:view="setView" @step="step" @today="today">
        <LegendButton />
      </ViewToolbar>

      <div v-if="personal && isAdmin" class="schedule-page__personal">
        <Button label="Занятие" icon="pi pi-plus" size="small" @click="openCreate" />
        <Button label="Профиль" icon="pi pi-user" severity="secondary" size="small" @click="profileOpen = true" />
        <RemoveParticipantButton :participant-id="personal.id" />
      </div>

      <ScheduleDay v-if="view === 'day'" :participant-id="participantId" :anchor="anchor" @open-event="openEvent" />
      <ScheduleWeek
        v-else-if="view === 'week'"
        :participant-id="participantId"
        :anchor="anchor"
        @open-event="openEvent"
        @open-day="openDay"
      />
      <ScheduleMonth v-else :participant-id="participantId" :anchor="anchor" @open-day="openDay" />

      <ProgressPanel :participant-id="participantId" />
    </div>

    <ScheduleLegend />
  </main>

  <template v-if="isAdmin">
    <AddParticipantDialog v-model:visible="addOpen" @created="goToParticipant" />
    <EditEventDialog
      v-model:visible="editOpen"
      :event-id="editEventId"
      :participant-ids="personal ? [personal.id] : []"
    />
    <EditParticipantDialog v-model:visible="profileOpen" :participant-id="personal?.id ?? null" />
    <SettingsDialog v-model:visible="settingsOpen" />
  </template>
  <MySettingsDialog v-else v-model:visible="settingsOpen" />
</template>

<style lang="sass" scoped>
@use './SchedulePage'
</style>
