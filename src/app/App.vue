<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

import { useScheduleStore } from '@/entities/schedule'
import { useReminderScheduler } from '@/features/notifications'
import { useThemeStore } from '@/features/toggle-theme'
import { useIsMobile, UndoToast } from '@/shared/ui'

const REMINDER_TOAST_MS = 10_000

// Initializes theme (reads saved choice and applies the dark-mode class) before first paint.
useThemeStore()

const store = useScheduleStore()
const toast = useToast()
const isMobile = useIsMobile()

useReminderScheduler({
  onToast: (message) => toast.add({ severity: 'info', summary: message, life: REMINDER_TOAST_MS }),
})
</script>

<template>
  <RouterView />
  <Toast position="top-center" />
  <UndoToast @undo="store.undo()" />
  <ConfirmDialog :position="isMobile ? 'bottom' : 'center'" />
</template>
