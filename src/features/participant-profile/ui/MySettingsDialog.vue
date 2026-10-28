<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { useDeviceStore, useScheduleStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'
import { AppDialog } from '@/shared/ui'

import AvatarPicker from './AvatarPicker.vue'
import SoundPicker from './SoundPicker.vue'

const visible = defineModel<boolean>('visible', { required: true })

const store = useScheduleStore()
const device = useDeviceStore()
const router = useRouter()

const me = computed(() => (device.participantId ? store.participantById(device.participantId) : undefined))

function leave() {
  visible.value = false
  device.logout()
  void router.replace({ name: ROUTE_NAMES.join })
}
</script>

<template>
  <AppDialog v-model:visible="visible" header="Мои настройки">
    <div v-if="me" class="my-settings">
      <section aria-labelledby="my-sound">
        <h3 id="my-sound" class="my-settings__title">Мой сигнал</h3>
        <label class="my-settings__label" for="my-sound-select">Звук напоминаний на этом устройстве</label>
        <SoundPicker
          input-id="my-sound-select"
          :model-value="me.alarmSound"
          @update:model-value="store.updateOwnProfile(me.id, { alarmSound: $event })"
        />
      </section>

      <section aria-labelledby="my-avatar">
        <h3 id="my-avatar" class="my-settings__title">Аватар</h3>
        <AvatarPicker
          :name="me.name"
          :color="me.color"
          :avatar="me.avatar"
          @change="store.updateOwnProfile(me.id, { avatar: $event })"
          @remove="store.updateOwnProfile(me.id, { avatar: undefined })"
        />
      </section>

      <Button label="Выйти" icon="pi pi-sign-out" severity="secondary" @click="leave" />
    </div>
  </AppDialog>
</template>

<style lang="sass" scoped>
@use './MySettingsDialog'
</style>
