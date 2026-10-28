<script setup lang="ts">
import { useRoute } from 'vue-router'

import { ParticipantDot, useScheduleStore } from '@/entities/schedule'
import { SyncBadge } from '@/features/sync-settings'
import { ThemeToggle } from '@/features/toggle-theme'
import { env, ROUTE_NAMES } from '@/shared/config'

const emit = defineEmits<{
  'add-participant': []
  'open-settings': []
}>()

const store = useScheduleStore()
const route = useRoute()
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <div class="app-header__top">
        <h1 class="app-header__title">
          <img src="/favicon.svg" alt="" width="28" height="28">
          {{ env.appTitle }}
        </h1>
        <div class="app-header__actions">
          <SyncBadge />
          <ThemeToggle />
          <Button
            icon="pi pi-cog"
            aria-label="Настройки"
            severity="secondary"
            variant="text"
            rounded
            @click="emit('open-settings')"
          />
        </div>
      </div>

      <nav class="app-header__tabs" aria-label="Участники">
        <RouterLink
          :to="{ name: ROUTE_NAMES.all, query: route.query }"
          class="app-header__tab"
          active-class="is-active"
        >
          Все
        </RouterLink>
        <RouterLink
          v-for="p in store.sortedParticipants"
          :key="p.id"
          :to="{ name: ROUTE_NAMES.participant, params: { id: p.id }, query: route.query }"
          class="app-header__tab"
          active-class="is-active"
        >
          <ParticipantDot :color="p.color" />
          {{ p.name }}
        </RouterLink>
        <button type="button" class="app-header__tab app-header__tab--add" @click="emit('add-participant')">
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
