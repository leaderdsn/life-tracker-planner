<script setup lang="ts">
import { computed, ref } from 'vue'

import { TECHNOLOGY_CATEGORY_LABELS, TechnologyCard, TechnologyCardSkeleton, useTechnologiesQuery } from '@/entities/technology'

import type { TechnologyCategory } from '@/entities/technology'

type CategoryFilter = TechnologyCategory | 'all'

const SKELETON_COUNT = 6

const { data: technologies, isPending, isError, error, refetch } = useTechnologiesQuery()

const category = ref<CategoryFilter>('all')

const categoryOptions = computed(() => [
  { value: 'all', label: 'Все' },
  ...Object.entries(TECHNOLOGY_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
])

const visibleTechnologies = computed(() => {
  const list = technologies.value ?? []
  return category.value === 'all' ? list : list.filter((t) => t.category === category.value)
})
</script>

<template>
  <div class="tech-stack-grid">
    <SelectButton
      v-model="category"
      class="tech-stack-grid__filter"
      :options="categoryOptions"
      option-label="label"
      option-value="value"
      :allow-empty="false"
      :disabled="isPending"
      aria-label="Фильтр по категории"
    />

    <Message v-if="isError" severity="error" class="tech-stack-grid__message">
      <div class="tech-stack-grid__error">
        <span>Не удалось загрузить список технологий: {{ error?.message }}</span>
        <Button label="Повторить" icon="pi pi-refresh" size="small" @click="refetch()" />
      </div>
    </Message>

    <ul v-else-if="isPending" class="tech-stack-grid__list" aria-busy="true">
      <li v-for="n in SKELETON_COUNT" :key="n">
        <TechnologyCardSkeleton />
      </li>
    </ul>

    <p v-else-if="visibleTechnologies.length === 0" class="tech-stack-grid__empty">
      В этой категории пока ничего нет.
    </p>

    <TransitionGroup v-else tag="ul" name="tech-stack-grid" class="tech-stack-grid__list">
      <li v-for="technology in visibleTechnologies" :key="technology.id">
        <TechnologyCard :technology="technology" />
      </li>
    </TransitionGroup>
  </div>
</template>

<style lang="sass" scoped>
@use './TechStackGrid'
</style>
