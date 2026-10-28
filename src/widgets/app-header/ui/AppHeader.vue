<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { initialLabels, useDeviceStore, useScheduleStore } from '@/entities/schedule'
import { SyncBadge } from '@/features/sync-settings'
import { ThemeToggle } from '@/features/toggle-theme'
import { env, ROUTE_NAMES } from '@/shared/config'
import { Avatar } from '@/shared/ui'

const emit = defineEmits<{
  'add-participant': []
  'open-settings': []
}>()

const logo = `${import.meta.env.BASE_URL}favicon.svg`

const store = useScheduleStore()
const device = useDeviceStore()
const labels = computed(() => initialLabels(store.sortedParticipants))
const isAdmin = computed(() => device.role === 'admin')
const tabs = computed(() =>
  isAdmin.value ? store.sortedParticipants : store.sortedParticipants.filter((p) => p.id === device.participantId),
)
const route = useRoute()
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-header__top">
        <h1 class="app-header__title">
          <img :src="logo" alt="" width="28" height="28">
          {{ env.appTitle }}
        </h1>
        <div class="app-header__actions">
          <SyncBadge />
          <ThemeToggle />
          <Button
            icon="pi pi-cog"
            :aria-label="isAdmin ? 'Настройки' : 'Мои настройки'"
            severity="secondary"
            variant="text"
            rounded
            @click="emit('open-settings')"
          />
        </div>
      </div>

      <nav class="app-header__tabs" aria-label="Участники">
        <RouterLink
          v-if="isAdmin"
          :to="{ name: ROUTE_NAMES.all, query: route.query }"
          class="app-header__tab"
          active-class="is-active"
        >
          Все
        </RouterLink>
        <RouterLink
          v-for="p in tabs"
          :key="p.id"
          :to="{ name: ROUTE_NAMES.participant, params: { id: p.id }, query: route.query }"
          class="app-header__tab"
          active-class="is-active"
        >
          <Avatar :name="p.name" :color="p.color" :src="p.avatar" :label="labels[p.id]" size="sm" />
          {{ p.name }}
        </RouterLink>
        <button v-if="isAdmin" type="button" class="app-header__tab app-header__tab--add" @click="emit('add-participant')">
          <i class="pi pi-plus" aria-hidden="true" />
          <span class="app-header__add-label">Добавить участника</span>
        </button>
      </nav>
    </div>
  </header>
</template>

<style lang="sass" scoped>
@use './AppHeader'
</style>
