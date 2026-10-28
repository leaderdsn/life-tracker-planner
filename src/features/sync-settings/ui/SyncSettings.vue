<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { hashPin, SOUND_GROUPS, SOUND_LABELS, useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'
import { env, ROUTE_NAMES } from '@/shared/config'
import { playOnce, unlockAudio, useClipboard } from '@/shared/lib'

import SyncBadge from './SyncBadge.vue'

const LEAD_OPTIONS = [5, 10, 15, 30, 45, 60].map((value) => ({ label: `За ${value} мин`, value }))
const IDLE_OPTIONS = [
  { label: '30 секунд', value: 30 },
  { label: '1 минута', value: 60 },
  { label: '2 минуты', value: 120 },
  { label: '5 минут', value: 300 },
]
const SOUND_OPTIONS = SOUND_GROUPS.map(({ label, sounds }) => ({
  label,
  items: sounds.map((value) => ({ label: SOUND_LABELS[value], value })),
}))
const PIN_PATTERN = /^\d{4,6}$/

const store = useScheduleStore()
const device = useDeviceStore()
const sync = useSyncStore()
const router = useRouter()
const { copied, copy } = useClipboard()

const enabled = computed(() => Boolean(device.householdId))
const hasPin = computed(() => store.settings.adminPinHash !== null)
const firebaseReady = Boolean(env.firebase)

const volumePercent = computed({
  get: () => Math.round(store.settings.alarmVolume * 100),
  set: (value: number) => store.updateSettings({ alarmVolume: value / 100 }),
})

async function preview() {
  await unlockAudio()
  playOnce(store.settings.alarmSound, store.settings.alarmVolume)
}

const pinFormOpen = ref(false)
const pin = ref('')
const pinRepeat = ref('')
const pinError = ref('')
const pinSaved = ref(false)

function openPinForm() {
  pin.value = ''
  pinRepeat.value = ''
  pinError.value = ''
  pinSaved.value = false
  pinFormOpen.value = true
}

async function savePin() {
  if (!PIN_PATTERN.test(pin.value)) {
    pinError.value = 'PIN состоит из 4–6 цифр'
    return
  }
  if (pin.value !== pinRepeat.value) {
    pinError.value = 'PIN в двух полях не совпадает'
    return
  }
  store.updateSettings({ adminPinHash: await hashPin(pin.value) })
  pinFormOpen.value = false
  pinSaved.value = true
}

function removePin() {
  store.updateSettings({ adminPinHash: null })
  pinSaved.value = false
}

function openGuestHere() {
  if (!device.householdId) sync.enableSync()
  device.setRole('guest')
  void router.replace({ name: ROUTE_NAMES.guest })
}
</script>

<template>
  <div class="sync-settings">
    <p v-if="!firebaseReady" class="sync-settings__note" role="note">
      <i class="pi pi-info-circle" aria-hidden="true" />
      Синхронизация между компьютерами не подключена: гостевой экран увидит изменения только в этом браузере.
      Как подключить Firebase, описано в README, раздел «Синхронизация (Firebase)».
    </p>

    <div class="sync-settings__row">
      <span>Состояние</span>
      <SyncBadge />
    </div>

    <template v-if="enabled">
      <div class="sync-settings__link">
        <label for="guest-link">Ссылка для гостевого экрана</label>
        <div class="sync-settings__link-row">
          <InputText id="guest-link" :model-value="sync.guestLink" readonly fluid />
          <Button
            :label="copied ? 'Скопировано' : 'Копировать'"
            :icon="copied ? 'pi pi-check' : 'pi pi-copy'"
            severity="secondary"
            @click="copy(sync.guestLink)"
          />
        </div>
        <p class="sync-settings__hint">
          Откройте её на втором компьютере: он запомнит гостевой режим и будет загружаться сразу в него.
        </p>
      </div>
    </template>
    <Button v-else label="Включить синхронизацию" icon="pi pi-link" @click="sync.enableSync()" />

    <div class="sync-settings__row">
      <label for="guest-lead">Звонить заранее</label>
      <Select
        input-id="guest-lead"
        :model-value="store.settings.guestAlarmLead"
        :options="LEAD_OPTIONS"
        option-label="label"
        option-value="value"
        @update:model-value="store.updateSettings({ guestAlarmLead: $event })"
      />
    </div>

    <div class="sync-settings__row">
      <label for="guest-idle">Возврат к «Все» через</label>
      <Select
        input-id="guest-idle"
        :model-value="store.settings.guestIdleReturn"
        :options="IDLE_OPTIONS"
        option-label="label"
        option-value="value"
        @update:model-value="store.updateSettings({ guestIdleReturn: $event })"
      />
    </div>

    <div class="sync-settings__row">
      <label for="guest-sound">Звук</label>
      <div class="sync-settings__inline">
        <Select
          input-id="guest-sound"
          :model-value="store.settings.alarmSound"
          :options="SOUND_OPTIONS"
          option-label="label"
          option-value="value"
          option-group-label="label"
          option-group-children="items"
          @update:model-value="store.updateSettings({ alarmSound: $event })"
        />
        <Button label="Прослушать" icon="pi pi-volume-up" severity="secondary" @click="preview" />
      </div>
    </div>

    <div class="sync-settings__volume">
      <label id="guest-volume-label">Громкость: {{ volumePercent }}%</label>
      <Slider
        v-model="volumePercent"
        :min="0"
        :max="100"
        :step="5"
        aria-labelledby="guest-volume-label"
      />
    </div>

    <div class="sync-settings__pin">
      <div class="sync-settings__row">
        <span>PIN для выхода с гостевого экрана</span>
        <div class="sync-settings__inline">
          <Button
            :label="hasPin ? 'Изменить PIN' : 'Задать PIN'"
            severity="secondary"
            @click="openPinForm"
          />
          <Button v-if="hasPin" label="Убрать" severity="secondary" variant="text" @click="removePin" />
        </div>
      </div>
      <p v-if="!hasPin" class="sync-settings__warning" role="note">
        <i class="pi pi-exclamation-triangle" aria-hidden="true" />
        PIN не задан: выйти из гостевого режима сможет любой, кто удержит угол экрана.
      </p>
      <p v-if="pinSaved" class="sync-settings__hint" role="status">PIN сохранён.</p>
      <form v-if="pinFormOpen" class="sync-settings__pin-form" @submit.prevent="savePin">
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
        <p v-if="pinError" class="sync-settings__error" role="alert">{{ pinError }}</p>
      </form>
    </div>

    <Button
      label="Открыть гостевой экран на этом устройстве"
      icon="pi pi-desktop"
      severity="secondary"
      @click="openGuestHere"
    />
  </div>
</template>

<style lang="sass" scoped>
@use './SyncSettings'
</style>
