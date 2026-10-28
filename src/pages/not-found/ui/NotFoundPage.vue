<script setup lang="ts">
import { ROUTE_NAMES } from '@/shared/config'
</script>

<template>
  <section class="not-found-page" aria-labelledby="not-found-title">
    <span class="not-found-page__code" aria-hidden="true">404</span>
    <h1 id="not-found-title" class="not-found-page__title">Такой страницы нет</h1>
    <p class="not-found-page__text">Возможно, ссылка устарела. Вернёмся к расписанию?</p>
    <RouterLink v-slot="{ navigate }" :to="{ name: ROUTE_NAMES.all }" custom>
      <Button label="К расписанию" icon="pi pi-calendar" @click="navigate" />
    </RouterLink>
  </section>
</template>

<style lang="sass" scoped>
@use './NotFoundPage'
</style>
