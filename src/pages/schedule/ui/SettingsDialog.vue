<script setup lang="ts">
import { useScheduleStore } from '@/entities/schedule'
import { ImportExportPanel } from '@/features/import-export'
import { NotificationSettings } from '@/features/notifications'
import { SyncSettings } from '@/features/sync-settings'
import { AppDialog } from '@/shared/ui'

const visible = defineModel<boolean>('visible', { required: true })

const store = useScheduleStore()
</script>

<template>
  <AppDialog v-model:visible="visible" header="Настройки" wide>
    <div class="settings-dialog">
      <section aria-labelledby="settings-marks">
        <h3 id="settings-marks" class="settings-dialog__title">Отметки о выполнении</h3>
        <div class="settings-dialog__row">
          <div class="settings-dialog__label">
            <label for="settings-auto-complete">Отмечать выполненным автоматически</label>
            <p class="settings-dialog__hint">Занятие отмечается, когда наступает время следующего</p>
          </div>
          <ToggleSwitch
            input-id="settings-auto-complete"
            :model-value="store.settings.autoComplete"
            @update:model-value="store.updateSettings({ autoComplete: $event })"
          />
        </div>
      </section>
      <section aria-labelledby="settings-notify">
        <h3 id="settings-notify" class="settings-dialog__title">Напоминания</h3>
        <NotificationSettings />
      </section>
      <section aria-labelledby="settings-guest">
        <h3 id="settings-guest" class="settings-dialog__title">Гостевой экран</h3>
        <SyncSettings />
      </section>
      <section aria-labelledby="settings-data">
        <h3 id="settings-data" class="settings-dialog__title">Данные</h3>
        <ImportExportPanel />
      </section>
    </div>
  </AppDialog>
</template>

<style lang="sass" scoped>
@use './SettingsDialog'
</style>
