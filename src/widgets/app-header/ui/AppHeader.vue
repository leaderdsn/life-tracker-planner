<script setup lang="ts">
import { ThemeToggle } from '@/features/toggle-theme'
import { APP_LINKS, env, ROUTE_NAMES } from '@/shared/config'

const NAV_ITEMS = [
  { hash: '#stack', label: 'Стек' },
  { hash: '#architecture', label: 'Архитектура' },
  { hash: '#quick-start', label: 'Быстрый старт' },
] as const
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink :to="{ name: ROUTE_NAMES.home }" class="app-header__logo">
        <img src="/favicon.svg" alt="" width="28" height="28">
        <span class="app-header__title">{{ env.appTitle }}</span>
      </RouterLink>

      <nav class="app-header__nav" aria-label="Разделы страницы">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.hash"
          :to="{ name: ROUTE_NAMES.home, hash: item.hash }"
          class="app-header__link"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="app-header__actions">
        <ThemeToggle />
        <Button
          as="a"
          :href="APP_LINKS.repository"
          target="_blank"
          rel="noopener noreferrer"
          icon="pi pi-github"
          aria-label="Репозиторий на GitHub"
          severity="secondary"
          variant="text"
          rounded
        />
      </div>
    </div>
  </header>
</template>

<style lang="sass" scoped>
@use './AppHeader'
</style>
