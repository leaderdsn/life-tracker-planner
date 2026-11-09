<script setup lang="ts">
import { computed, ref } from 'vue'

import { useScheduleStore } from '@/entities/schedule'

import { requestNotificationPermission } from '../model/notify'

const BANNER_DISMISSED_KEY = 'life-tracker:notification-banner-dismissed'

const store = useScheduleStore()

function readDismissed(): boolean {
  try {
    return localStorage.getItem(BANNER_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const permission = ref<NotificationPermission | 'unsupported'>(
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
)
const dismissed = ref(readDismissed())

const mode = computed<'ask' | 'denied' | null>(() => {
  if (dismissed.value) return null
  if (permission.value === 'default') return 'ask'
  if (permission.value === 'denied' && store.settings.notificationsEnabled) return 'denied'
  return null
})

async function enable() {
  store.updateSettings({ notificationsEnabled: true })
  permission.value = await requestNotificationPermission()
}

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(BANNER_DISMISSED_KEY, '1')
  } catch {
    // The banner then returns after a reload.
  }
}
</script>

<template>
  <aside v-if="mode" class="notification-banner" role="region" aria-label="Уведомления">
    <i class="pi pi-bell notification-banner__icon" aria-hidden="true" />
    <p v-if="mode === 'ask'" class="notification-banner__text">Включите уведомления, чтобы не пропустить занятия</p>
    <p v-else class="notification-banner__text">
      Уведомления заблокированы. Разрешите их в настройках сайта в браузере (значок замка рядом с адресом), затем обновите страницу.
    </p>
    <Button v-if="mode === 'ask'" label="Включить" size="small" @click="enable" />
    <Button
      icon="pi pi-times"
      aria-label="Скрыть"
      severity="secondary"
      variant="text"
      rounded
      size="small"
      @click="dismiss"
    />
  </aside>
</template>

<style lang="sass" scoped>
@use './NotificationBanner'
</style>
