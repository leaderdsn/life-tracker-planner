<script setup lang="ts">
import { FSD_LAYERS, FSD_RULES } from '../config/layers'
</script>

<template>
  <div class="architecture-overview">
    <ol class="architecture-overview__layers" aria-label="Слои FSD сверху вниз">
      <li v-for="(layer, index) in FSD_LAYERS" :key="layer.name" class="architecture-overview__layer">
        <span class="architecture-overview__index" aria-hidden="true">{{ index + 1 }}</span>
        <div class="architecture-overview__body">
          <code class="architecture-overview__name">{{ layer.name }}</code>
          <span class="architecture-overview__description">{{ layer.description }}</span>
        </div>
        <code class="architecture-overview__example">{{ layer.example }}</code>
      </li>
    </ol>

    <aside class="architecture-overview__rules">
      <h3 class="architecture-overview__rules-title">
        <i class="pi pi-arrow-down" aria-hidden="true" />
        Направление импортов
      </h3>
      <ul class="architecture-overview__rules-list">
        <li v-for="rule in FSD_RULES" :key="rule">{{ rule }}</li>
      </ul>
    </aside>
  </div>
</template>

<style lang="sass" scoped>
@use './ArchitectureOverview'
</style>
