<script setup lang="ts">
import { GuestExit } from '@/features/guest-exit'
import { GuestBoard } from '@/widgets/guest-board'

import { useGuestSession } from '../model/useGuestSession'

const { started, fullscreen, start, toggleFullscreen } = useGuestSession()
</script>

<template>
  <div class="guest-page">
    <GuestBoard>
      <template #actions>
        <button
          type="button"
          class="guest-page__fullscreen"
          :aria-label="fullscreen ? 'Выйти из полноэкранного режима' : 'Во весь экран'"
          @click="toggleFullscreen"
        >
          <i :class="fullscreen ? 'pi pi-window-minimize' : 'pi pi-window-maximize'" aria-hidden="true" />
        </button>
      </template>
    </GuestBoard>

    <GuestExit />

    <button v-if="!started" type="button" class="guest-page__start" @click="start">
      <i class="pi pi-play-circle guest-page__start-icon" aria-hidden="true" />
      <span class="guest-page__start-title">Нажмите, чтобы начать</span>
      <span class="guest-page__start-hint">Включим звук и полноэкранный режим</span>
    </button>
  </div>
</template>

<style lang="sass" scoped>
@use './GuestPage'
</style>
