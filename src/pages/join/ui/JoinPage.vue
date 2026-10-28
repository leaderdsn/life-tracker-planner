<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue'
import { useRouter } from 'vue-router'

import { initialLabels, useDeviceStore, useScheduleStore, useSyncStore } from '@/entities/schedule'
import type { Participant } from '@/entities/schedule'
import { PinKeypad } from '@/features/guest-exit'
import { env, ROUTE_NAMES } from '@/shared/config'
import { Avatar } from '@/shared/ui'

type Target = { kind: 'participant'; participant: Participant } | { kind: 'admin' }

const logo = `${import.meta.env.BASE_URL}favicon.svg`

const store = useScheduleStore()
const device = useDeviceStore()
const sync = useSyncStore()
const router = useRouter()

const keypad = useTemplateRef<{ clear: () => void }>('keypad')
const target = ref<Target | null>(null)
const error = ref('')
const busy = ref(false)
const timedOut = ref(false)
const LOAD_TIMEOUT_MS = 10_000
let loadTimer: ReturnType<typeof setTimeout> | undefined

const people = computed(() =>
  [...(device.householdId ? sync.remoteParticipants : store.participants)].sort((a, b) => a.order - b.order),
)
const labels = computed(() => initialLabels(people.value))
const adminHasPin = computed(() =>
  (device.householdId ? (sync.remoteSchedule?.settings.adminPinHash ?? null) : store.settings.adminPinHash) !== null,
)
const waiting = computed(() => (device.householdId ? !sync.remoteReceived : false))

function armTimer() {
  clearTimeout(loadTimer)
  timedOut.value = false
  if (waiting.value) loadTimer = setTimeout(() => (timedOut.value = true), LOAD_TIMEOUT_MS)
}

watch(waiting, armTimer, { immediate: true })
onBeforeUnmount(() => clearTimeout(loadTimer))

function retry() {
  sync.stop()
  sync.start()
  armTimer()
}
const targetName = computed(() => (target.value?.kind === 'participant' ? target.value.participant.name : 'Администратор'))

function finish(ok: boolean, destination: () => void) {
  if (ok) {
    destination()
    return
  }
  error.value = 'Неверный PIN'
  keypad.value?.clear()
}

async function enter(pin: string) {
  const current = target.value
  if (!current) return
  busy.value = true
  error.value = ''
  try {
    if (current.kind === 'admin') {
      finish(await device.loginAdmin(pin), () => void router.replace({ name: ROUTE_NAMES.all }))
    } else {
      const { id } = current.participant
      finish(
        await device.loginParticipant(id, pin),
        () => void router.replace({ name: ROUTE_NAMES.participant, params: { id } }),
      )
    }
  } finally {
    busy.value = false
  }
}

function pick(next: Target) {
  error.value = ''
  target.value = next
  const needsPin = next.kind === 'admin' || Boolean(next.participant.pinHash)
  if (!needsPin) void enter('')
}

function back() {
  target.value = null
  error.value = ''
}
</script>

<template>
  <main class="join-page">
    <section class="join-page__card" aria-labelledby="join-title">
      <img class="join-page__logo" :src="logo" alt="" width="48" height="48">
      <h1 id="join-title" class="join-page__title">
        {{ target ? `Привет, ${targetName}!` : env.appTitle }}
      </h1>

      <template v-if="!target">
        <p class="join-page__lead">Кто вы?</p>
        <template v-if="waiting">
          <p v-if="timedOut" class="join-page__status" role="alert">Нет связи</p>
          <p v-else class="join-page__status" role="status">Загружаю список участников…</p>
          <Button v-if="timedOut" label="Повторить" icon="pi pi-refresh" @click="retry" />
        </template>
        <ul v-else class="join-page__list">
          <li v-for="p in people" :key="p.id">
            <button type="button" class="join-page__person" @click="pick({ kind: 'participant', participant: p })">
              <Avatar :name="p.name" :color="p.color" :src="p.avatar" :label="labels[p.id]" size="lg" />
              <span class="join-page__name" :title="p.name">{{ p.name }}</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              class="join-page__person join-page__person--admin"
              :disabled="!adminHasPin"
              @click="pick({ kind: 'admin' })"
            >
              <span class="join-page__admin-icon" aria-hidden="true"><i class="pi pi-shield" /></span>
              <span class="join-page__name">Администратор</span>
            </button>
          </li>
        </ul>
        <p v-if="!waiting && !adminHasPin" class="join-page__warning" role="note">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          PIN администратора не задан — задайте его на основном устройстве: Настройки → Гостевой экран
        </p>
      </template>

      <template v-else>
        <p class="join-page__lead">Введите PIN</p>
        <PinKeypad ref="keypad" :error="error" :busy="busy" @submit="enter" @cancel="back" />
      </template>
    </section>
  </main>
</template>

<style lang="sass" scoped>
@use './JoinPage'
</style>
