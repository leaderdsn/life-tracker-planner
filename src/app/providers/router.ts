import { createRouter, createWebHashHistory } from 'vue-router'

import { useDeviceStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import type { RouteRecordRaw } from 'vue-router'

const loadSchedulePage = () => import('@/pages/schedule').then((m) => m.SchedulePage)
const loadGuestPage = () => import('@/pages/guest').then((m) => m.GuestPage)
const loadJoinPage = () => import('@/pages/join').then((m) => m.JoinPage)

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAMES.all } },
  { path: '/all', name: ROUTE_NAMES.all, component: loadSchedulePage },
  { path: '/p/:id', name: ROUTE_NAMES.participant, component: loadSchedulePage, props: true },
  { path: '/guest', name: ROUTE_NAMES.guest, component: loadGuestPage },
  { path: '/join', name: ROUTE_NAMES.join, component: loadJoinPage },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
  },
]

/**
 * Links shared through messengers lose everything after "#" surprisingly often,
 * so invites use a plain query (?join=… / ?guest=…) that is turned into a hash route here.
 */
export function launchRouteFromSearch(search: string): string | null {
  const params = new URLSearchParams(search)
  const join = params.get('join')
  if (join) return `/join?h=${encodeURIComponent(join)}`
  const guest = params.get('guest')
  if (guest) return `/guest?h=${encodeURIComponent(guest)}`
  return null
}

const launchRoute = launchRouteFromSearch(location.search)
if (launchRoute) history.replaceState(null, '', `${location.pathname}#${launchRoute}`)

export const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(_to, _from, savedPosition) {
    return savedPosition ?? false
  },
})

router.beforeEach((to) => {
  const device = useDeviceStore()
  const household = typeof to.query.h === 'string' ? to.query.h : ''

  if (to.name === ROUTE_NAMES.guest && household) {
    device.setHousehold(household)
    device.setRole('guest')
    return { name: ROUTE_NAMES.guest }
  }

  if (to.name === ROUTE_NAMES.join && household) {
    const sameAdmin = device.role === 'admin' && device.householdId === household
    if (sameAdmin) return { name: ROUTE_NAMES.all }
    if (device.householdId !== household || device.role === 'guest' || !device.participantId) {
      device.setHousehold(household)
      device.logout()
    }
    return { name: ROUTE_NAMES.join }
  }

  if (device.role === 'guest') return to.name === ROUTE_NAMES.guest ? true : { name: ROUTE_NAMES.guest }

  if (device.role === 'participant') {
    const own = device.participantId
    if (!own) return to.name === ROUTE_NAMES.join ? true : { name: ROUTE_NAMES.join }
    if (to.name === ROUTE_NAMES.participant && to.params.id === own) return true
    return { name: ROUTE_NAMES.participant, params: { id: own }, query: { view: to.query.view, date: to.query.date } }
  }

  if (to.name === ROUTE_NAMES.guest || to.name === ROUTE_NAMES.join) return { name: ROUTE_NAMES.all }
  return true
})
