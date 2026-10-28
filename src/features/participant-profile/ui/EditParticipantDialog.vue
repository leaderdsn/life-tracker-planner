<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { hashParticipantPin, useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'
import { useClipboard } from '@/shared/lib'
import { AppDialog } from '@/shared/ui'

import AvatarPicker from './AvatarPicker.vue'
import SoundPicker from './SoundPicker.vue'

const props = defineProps<{
  participantId: string | null
}>()

const visible = defineModel<boolean>('visible', { required: true })

const PIN_PATTERN = /^\d{4,6}$/

const store = useScheduleStore()
const device = useDeviceStore()
const sync = useSyncStore()
const { copied, copy } = useClipboard()

const participant = computed(() => (props.participantId ? store.participantById(props.participantId) : undefined))
const hasPin = computed(() => Boolean(participant.value?.pinHash))
const inviteLink = computed(() => sync.guestLink.replace('#/guest?', '#/join?'))

const pinFormOpen = ref(false)
const pin = ref('')
const pinRepeat = ref('')
const pinError = ref('')
const pinMessage = ref('')

watch(visible, (open) => {
  if (!open) return
  pinFormOpen.value = false
  pinError.value = ''
  pinMessage.value = ''
})

function openPinForm() {
  pin.value = ''
  pinRepeat.value = ''
  pinError.value = ''
  pinMessage.value = ''
  pinFormOpen.value = true
}

async function savePin() {
  const id = props.participantId
  if (!id) return
  if (!PIN_PATTERN.test(pin.value)) {
    pinError.value = 'PIN состоит из 4–6 цифр'
    return
  }
  if (pin.value !== pinRepeat.value) {
    pinError.value = 'PIN в двух полях не совпадает'
    return
  }
  store.updateParticipant(id, { pinHash: await hashParticipantPin(pin.value, id, device.householdId) })
  pinFormOpen.value = false
  pinMessage.value = 'PIN сохранён.'
}

function removePin() {
  if (!props.participantId) return
  store.updateParticipant(props.participantId, { pinHash: null })
  pinFormOpen.value = false
  pinMessage.value = 'PIN убран: участник входит без него.'
}
</script>

<template>
  <AppDialog v-model:visible="visible" :header="participant ? `Профиль: ${participant.name}` : 'Профиль'">
    <div v-if="participant" class="edit-participant">
      <section aria-labelledby="ep-avatar">
        <h3 id="ep-avatar" class="edit-participant__title">Аватар</h3>
        <AvatarPicker
          :name="participant.name"
          :color="participant.color"
          :avatar="participant.avatar"
          @change="store.updateOwnProfile(participant.id, { avatar: $event })"
          @remove="store.updateOwnProfile(participant.id, { avatar: undefined })"
        />
      </section>

      <section aria-labelledby="ep-sound">
        <h3 id="ep-sound" class="edit-participant__title">Сигнал</h3>
        <label class="edit-participant__label" for="ep-sound-select">Звук напоминаний для этого участника</label>
        <SoundPicker
          input-id="ep-sound-select"
          :model-value="participant.alarmSound"
          @update:model-value="store.updateOwnProfile(participant.id, { alarmSound: $event })"
        />
      </section>

      <section aria-labelledby="ep-pin">
        <h3 id="ep-pin" class="edit-participant__title">PIN для входа</h3>
        <p class="edit-participant__hint">
          Защита от случайных правок, а не от взлома: участник вводит PIN после выбора своего имени.
        </p>
        <div class="edit-participant__inline">
          <Button :label="hasPin ? 'Изменить PIN' : 'Задать PIN'" severity="secondary" @click="openPinForm" />
          <Button v-if="hasPin" label="Убрать PIN" severity="secondary" variant="text" @click="removePin" />
        </div>
        <p v-if="!hasPin && !pinMessage" class="edit-participant__hint">PIN не задан: вход без пароля.</p>
        <p v-if="pinMessage" class="edit-participant__hint" role="status">{{ pinMessage }}</p>
        <form v-if="pinFormOpen" class="edit-participant__pin-form" @submit.prevent="savePin">
          <InputText
            v-model="pin"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            maxlength="6"
            placeholder="Новый PIN"
            aria-label="Новый PIN"
          />
          <InputText
            v-model="pinRepeat"
            type="password"
            inputmode="numeric"
            autocomplete="off"
            maxlength="6"
            placeholder="Ещё раз"
            aria-label="Повторите PIN"
          />
          <Button type="submit" label="Сохранить" />
          <p v-if="pinError" class="edit-participant__error" role="alert">{{ pinError }}</p>
        </form>
      </section>

      <section aria-labelledby="ep-invite">
        <h3 id="ep-invite" class="edit-participant__title">Приглашение</h3>
        <template v-if="device.householdId">
          <Button
            :label="copied ? 'Ссылка скопирована' : 'Пригласить'"
            :icon="copied ? 'pi pi-check' : 'pi pi-link'"
            severity="secondary"
            @click="copy(inviteLink)"
          />
          <p class="edit-participant__hint">
            Отправьте ссылку: на её устройстве нужно выбрать своё имя и ввести PIN.
          </p>
        </template>
        <p v-else class="edit-participant__hint">
          Чтобы пригласить, включите синхронизацию: Настройки, раздел «Гостевой экран».
        </p>
      </section>
    </div>
  </AppDialog>
</template>

<style lang="sass" scoped>
@use './EditParticipantDialog'
</style>
