import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useScheduleStore } from '@/entities/schedule'
import { addDays, parseIsoDate, toIsoDate } from '@/shared/lib'
import { ROUTE_NAMES } from '@/shared/config'
import { useIsMobile } from '@/shared/ui'
import { isScheduleView } from '@/widgets/view-toolbar'
import type { ScheduleView } from '@/widgets/view-toolbar'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

export function useScheduleRoute() {
  const route = useRoute()
  const router = useRouter()
  const store = useScheduleStore()
  const isMobile = useIsMobile()

  const participantId = computed(() =>
    route.name === ROUTE_NAMES.participant ? String(route.params.id) : 'all',
  )

  const view = computed<ScheduleView>(() => {
    const raw = queryString(route.query.view)
    if (isScheduleView(raw)) return raw
    return isMobile.value ? 'day' : 'week'
  })

  const anchor = computed(() => {
    const raw = queryString(route.query.date)
    if (raw && ISO_DATE.test(raw) && toIsoDate(parseIsoDate(raw)) === raw) return raw
    return toIsoDate(new Date())
  })

  function update(patch: { view?: ScheduleView; date?: string }) {
    void router.replace({
      query: { ...route.query, view: patch.view ?? view.value, date: patch.date ?? anchor.value },
    })
  }

  function step(direction: -1 | 1) {
    const date = parseIsoDate(anchor.value)
    const next =
      view.value === 'day'
        ? addDays(date, direction)
        : view.value === 'week'
          ? addDays(date, direction * 7)
          : new Date(date.getFullYear(), date.getMonth() + direction, 1)
    update({ date: toIsoDate(next) })
  }

  function goToParticipant(id: string) {
    void router.push({ name: ROUTE_NAMES.participant, params: { id }, query: route.query })
  }

  watch(
    () => [participantId.value, store.participants.length],
    () => {
      if (participantId.value !== 'all' && !store.participantById(participantId.value)) {
        void router.replace({ name: ROUTE_NAMES.all, query: route.query })
      }
    },
    { immediate: true },
  )

  return {
    participantId,
    view,
    anchor,
    setView: (next: ScheduleView) => update({ view: next }),
    today: () => update({ date: toIsoDate(new Date()) }),
    openDay: (date: string) => update({ view: 'day', date }),
    step,
    goToParticipant,
  }
}
