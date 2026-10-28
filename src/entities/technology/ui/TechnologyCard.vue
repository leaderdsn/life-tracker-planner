<script setup lang="ts">
import { computed } from 'vue'

import { TECHNOLOGY_CATEGORY_LABELS } from '../config/categories'
import { getTechnologyLogo } from './technologyLogos'

import type { Technology } from '../model/types'

const { technology } = defineProps<{
  technology: Technology
}>()

const categoryLabel = computed(() => TECHNOLOGY_CATEGORY_LABELS[technology.category])
const isPackage = computed(() => technology.packageName !== null)
const logo = computed(() => getTechnologyLogo(technology.id))
</script>

<template>
  <Card class="technology-card" :style="{ '--technology-accent': technology.accent }">
    <template #header>
      <div class="technology-card__header">
        <span class="technology-card__badge" aria-hidden="true">
          <img v-if="logo" class="technology-card__logo" :src="logo" alt="" width="28" height="28" loading="lazy">
          <template v-else>{{ technology.monogram }}</template>
        </span>
        <Tag
          :value="isPackage ? `v${technology.version}` : technology.version"
          :severity="isPackage ? 'success' : 'info'"
          rounded
        />
      </div>
    </template>
    <template #title>
      <h3 class="technology-card__title">{{ technology.name }}</h3>
    </template>
    <template #subtitle>{{ categoryLabel }}</template>
    <template #content>
      <p class="technology-card__description">{{ technology.description }}</p>
      <p class="technology-card__purpose">
        <i class="pi pi-check-circle" aria-hidden="true" />
        <span>{{ technology.purpose }}</span>
      </p>
    </template>
    <template #footer>
      <a class="technology-card__link" :href="technology.docsUrl" target="_blank" rel="noopener noreferrer">
        Документация
        <i class="pi pi-arrow-up-right" aria-hidden="true" />
      </a>
    </template>
  </Card>
</template>

<style lang="sass" scoped>
@use './TechnologyCard'
</style>
