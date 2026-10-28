<script setup lang="ts">
import { ref, useId } from 'vue'

import { resizeAvatar } from '@/entities/schedule'
import { Avatar } from '@/shared/ui'

defineProps<{
  name: string
  color: string
  avatar?: string
}>()

const emit = defineEmits<{
  change: [dataUrl: string]
  remove: []
}>()

const inputId = useId()
const input = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')

async function onPick(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  target.value = ''
  if (!file) return
  busy.value = true
  error.value = ''
  try {
    emit('change', await resizeAvatar(file))
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Не получилось загрузить фото'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="avatar-picker">
    <Avatar :name="name" :color="color" :src="avatar" size="xl" />
    <div class="avatar-picker__actions">
      <input
        :id="inputId"
        ref="input"
        class="avatar-picker__input"
        type="file"
        accept="image/*"
        tabindex="-1"
        @change="onPick"
      >
      <Button
        :label="avatar ? 'Заменить фото' : 'Загрузить фото'"
        icon="pi pi-camera"
        severity="secondary"
        :loading="busy"
        @click="input?.click()"
      />
      <Button v-if="avatar" label="Убрать фото" icon="pi pi-trash" severity="secondary" variant="text" @click="emit('remove')" />
      <p v-if="error" class="avatar-picker__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style lang="sass" scoped>
@use './AvatarPicker'
</style>
