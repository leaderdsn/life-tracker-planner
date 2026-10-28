<script setup lang="ts">
const { id, title, subtitle } = defineProps<{
  id: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <section :id="id" class="app-section" :aria-labelledby="`${id}-title`">
    <header class="app-section__header">
      <h2 :id="`${id}-title`" class="app-section__title">{{ title }}</h2>
      <p v-if="subtitle" class="app-section__subtitle">{{ subtitle }}</p>
      <slot name="actions" />
    </header>
    <slot />
  </section>
</template>

<style lang="sass" scoped>
@use './AppSection'
</style>
