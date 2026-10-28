<script setup lang="ts">
import { APP_LINKS, APP_VERSION, env } from '@/shared/config'
import { AppSection } from '@/shared/ui'
import { ArchitectureOverview } from '@/widgets/architecture-overview'
import { QuickStart } from '@/widgets/quick-start'
import { TechStackGrid } from '@/widgets/tech-stack-grid'

const HIGHLIGHTS = ['Vue 3', 'Vite', 'TypeScript', 'FSD', 'PrimeVue'] as const
</script>

<template>
  <div class="home-page">
    <section class="home-page__hero" aria-labelledby="hero-title">
      <Tag :value="`v${APP_VERSION}`" severity="secondary" rounded class="home-page__version" />
      <h1 id="hero-title" class="home-page__title">
        {{ env.appTitle }}
        <span class="home-page__accent">— готовая база для нового фронтенда</span>
      </h1>
      <p class="home-page__lead">
        Стартовый шаблон на Vue 3, Vite и TypeScript с архитектурой Feature-Sliced Design. Настроены роутинг,
        состояние, серверные данные, UI-библиотека, стили на Sass, линтинг, тесты и git-хуки — клонируйте и
        начинайте писать фичи.
      </p>
      <div class="home-page__actions">
        <Button
          as="a"
          :href="APP_LINKS.readme"
          target="_blank"
          rel="noopener noreferrer"
          label="Документация"
          icon="pi pi-book"
        />
        <Button
          as="a"
          :href="APP_LINKS.repository"
          target="_blank"
          rel="noopener noreferrer"
          label="GitHub"
          icon="pi pi-github"
          severity="secondary"
          variant="outlined"
        />
      </div>
      <ul class="home-page__highlights" aria-label="Ключевые технологии">
        <li v-for="item in HIGHLIGHTS" :key="item">
          <Chip :label="item" />
        </li>
      </ul>
    </section>

    <AppSection
      id="stack"
      title="Технологии"
      subtitle="Версии подтягиваются из package.json, список загружается через TanStack Query — так шаблон сам демонстрирует свой стек."
    >
      <TechStackGrid />
    </AppSection>

    <AppSection
      id="architecture"
      title="Архитектура"
      subtitle="Код организован по Feature-Sliced Design: шесть слоёв, строгое направление импортов и публичный API у каждого слайса."
    >
      <ArchitectureOverview />
    </AppSection>

    <AppSection id="quick-start" title="Быстрый старт" subtitle="Четыре команды от клонирования до проверки качества.">
      <QuickStart />
    </AppSection>
  </div>
</template>

<style lang="sass" scoped>
@use './HomePage'
</style>
