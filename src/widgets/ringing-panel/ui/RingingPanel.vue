<script setup lang="ts">
import { computed } from 'vue'

import { useDeviceStore, useSyncStore } from '@/entities/schedule'

const device = useDeviceStore()
const sync = useSyncStore()

const clock = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

const items = computed(() =>
  Object.entries(sync.ringing)
    .map(([key, info]) => ({ key, ...info }))
    .sort((a, b) => a.startedAt - b.startedAt),
)
</script>

<template>
  <section v-if="device.role === 'admin' && items.length" class="ringing-panel" role="alert" aria-label="Сейчас звенит у гостя">
    <header class="ringing-panel__head">
      <h2 class="ringing-panel__title">
        <i class="pi pi-bell ringing-panel__bell" aria-hidden="true" />
        Сейчас звенит у гостя
      </h2>
      <Button
        v-if="items.length > 1"
        label="Выключить все"
        severity="secondary"
        size="small"
        @click="sync.silenceAll()"
      />
    </header>
    <ul class="ringing-panel__list">
      <li v-for="item in items" :key="item.key" class="ringing-panel__item">
        <div class="ringing-panel__text">
          <span class="ringing-panel__name">{{ item.title }}</span>
          <span class="ringing-panel__meta">
            {{ item.participantNames.join(', ') }} · с {{ clock.format(item.startedAt) }}
          </span>
        </div>
        <Button label="Выключить" icon="pi pi-bell-slash" size="small" @click="sync.silence(item.key)" />
      </li>
    </ul>
  </section>
</template>

<style lang="sass" scoped>
@use './RingingPanel'
</style>
