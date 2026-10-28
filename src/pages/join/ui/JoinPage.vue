<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
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

const people = computed(() =>
  (sync.remoteParticipants.length ? [...sync.remoteParticipants] : [...store.participants]).sort((a, b) => a.order - b.order),
)
const labels = computed(() => initialLabels(people.value))
const adminHasPin = computed(() => (sync.remoteSchedule?.settings.adminPinHash ?? store.settings.adminPinHash) !== null)
const waiting = computed(() => people.value.length === 0 && sync.status !== 'online')
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
        <p v-if="waiting" class="join-page__status" role="status">Загружаю список участников…</p>
        <ul v-else class="join-page__list">
          <li v-for="p in people" :key="p.id">
            <button type="button" class="join-page__person" @click="pick({ kind: 'participant', participant: p })">
              <Avatar :name="p.name" :color="p.color" :src="p.avatar" :label="labels[p.id]" size="lg" />
              <span class="join-page__name" :title="p.name">{{ p.name }}</span>
            </button>
          </li>
          <li>
            <button type="button" class="join-page__person join-page__person--admin" @click="pick({ kind: 'admin' })">
              <span class="join-page__admin-icon" aria-hidden="true"><i class="pi pi-shield" /></span>
              <span class="join-page__name">Администратор</span>
            </button>
          </li>
        </ul>
      </template>

      <template v-else>
        <p v-if="target.kind === 'admin' && !adminHasPin" class="join-page__warning" role="note">
          <i class="pi pi-exclamation-triangle" aria-hidden="true" />
          Задайте PIN администратора: сейчас вход открыт для всех.
        </p>
        <template v-else>
          <p class="join-page__lead">Введите PIN</p>
          <PinKeypad ref="keypad" :error="error" :busy="busy" @submit="enter" @cancel="back" />
        </template>
        <div v-if="target.kind === 'admin' && !adminHasPin" class="join-page__actions">
          <Button label="Войти" icon="pi pi-sign-in" :loading="busy" @click="enter('')" />
          <Button label="Назад" severity="secondary" variant="text" icon="pi pi-arrow-left" @click="back" />
        </div>
      </template>
    </section>
  </main>
</template>

<style lang="sass" scoped>
@use './JoinPage'
</style>
