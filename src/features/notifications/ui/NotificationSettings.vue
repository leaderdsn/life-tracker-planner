<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { REMIND_OPTIONS, TimeInput, useScheduleStore } from '@/entities/schedule'
import { validateTime } from '@/shared/lib'

import { requestNotificationPermission } from '../model/notify'

const store = useScheduleStore()

const permission = ref<NotificationPermission | 'unsupported'>(
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
)

const remindOptions = REMIND_OPTIONS.map((value) => ({
  label: value === 0 ? 'В момент начала' : `За ${value} мин`,
  value,
}))

const quietOn = computed({
  get: () => store.settings.quietHours !== null,
  set: (on: boolean) => store.updateSettings({ quietHours: on ? { from: quietFrom.value, to: quietTo.value } : null }),
})
const quietFrom = ref(store.settings.quietHours?.from ?? '22:00')
const quietTo = ref(store.settings.quietHours?.to ?? '07:00')

watch([quietFrom, quietTo], ([from, to]) => {
  const a = validateTime(from)
  const b = validateTime(to)
  if (quietOn.value && 'value' in a && 'value' in b) {
    store.updateSettings({ quietHours: { from: a.value, to: b.value } })
  }
})

const status = computed(() => {
  if (!store.settings.notificationsEnabled) return null
  if (permission.value === 'granted') return { icon: 'pi pi-check-circle', text: 'Системные уведомления включены.' }
  if (permission.value === 'denied') {
    return { icon: 'pi pi-info-circle', text: 'Браузер не разрешил уведомления, поэтому напоминания придут сообщением внутри приложения.' }
  }
  if (permission.value === 'unsupported') {
    return { icon: 'pi pi-info-circle', text: 'Это устройство не показывает системные уведомления, напоминания придут внутри приложения.' }
  }
  return { icon: 'pi pi-info-circle', text: 'Разрешение на уведомления пока не дано, напоминания придут внутри приложения.' }
})

async function toggleEnabled(on: boolean) {
  store.updateSettings({ notificationsEnabled: on })
  if (on) permission.value = await requestNotificationPermission()
}
</script>

<template>
  <div class="notification-settings">
    <div class="notification-settings__row">
      <label for="notify-enabled">Напоминания о занятиях</label>
      <ToggleSwitch
        input-id="notify-enabled"
        :model-value="store.settings.notificationsEnabled"
        @update:model-value="toggleEnabled"
      />
    </div>

    <p v-if="status" class="notification-settings__status" role="status">
      <i :class="status.icon" aria-hidden="true" />
      {{ status.text }}
    </p>

    <div class="notification-settings__row">
      <label for="notify-lead">Напоминать заранее</label>
      <Select
        input-id="notify-lead"
        :model-value="store.settings.defaultRemindBefore"
        :options="remindOptions"
        option-label="label"
        option-value="value"
        @update:model-value="store.updateSettings({ defaultRemindBefore: $event })"
      />
    </div>

    <div class="notification-settings__row">
      <label for="notify-sound">Короткий сигнал</label>
      <ToggleSwitch
        input-id="notify-sound"
        :model-value="store.settings.sound"
        @update:model-value="store.updateSettings({ sound: $event })"
      />
    </div>

    <div class="notification-settings__row">
      <label for="notify-quiet">Тихие часы</label>
      <ToggleSwitch v-model="quietOn" input-id="notify-quiet" />
    </div>
    <div v-if="quietOn" class="notification-settings__quiet">
      <TimeInput id="quiet-from" v-model="quietFrom" label="С" />
      <TimeInput id="quiet-to" v-model="quietTo" label="До" />
    </div>

    <p class="notification-settings__hint">
      Напоминания работают, пока приложение открыто или установлено и запущено. Сервера для push-сообщений нет,
      поэтому закрытое приложение ничего не пришлёт.
    </p>
  </div>
</template>

<style lang="sass" scoped>
@use './NotificationSettings'
</style>
