<script setup lang="ts">
import { ImportExportPanel } from '@/features/import-export'
import { NotificationSettings } from '@/features/notifications'
import { AppDialog } from '@/shared/ui'

const visible = defineModel<boolean>('visible', { required: true })
</script>

<template>
  <AppDialog v-model:visible="visible" header="Настройки" wide>
    <div class="settings-dialog">
      <section aria-labelledby="settings-notify">
        <h3 id="settings-notify" class="settings-dialog__title">Напоминания</h3>
        <NotificationSettings />
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
