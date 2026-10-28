<script setup lang="ts">
import { AppCodeBlock } from '@/shared/ui'

import { QUICK_START_STEPS } from '../config/steps'
</script>

<template>
  <ol class="quick-start">
    <li v-for="(step, index) in QUICK_START_STEPS" :key="step.command" class="quick-start__step">
      <span class="quick-start__number" aria-hidden="true">{{ index + 1 }}</span>
      <div class="quick-start__content">
        <h3 class="quick-start__title">{{ step.title }}</h3>
        <p class="quick-start__description">{{ step.description }}</p>
        <AppCodeBlock :code="step.command" />
      </div>
    </li>
  </ol>
</template>

<style lang="sass" scoped>
@use './QuickStart'
</style>
