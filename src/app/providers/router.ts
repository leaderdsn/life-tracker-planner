import { createRouter, createWebHashHistory } from 'vue-router'

import { useDeviceStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import type { RouteRecordRaw } from 'vue-router'

const loadSchedulePage = () => import('@/pages/schedule').then((m) => m.SchedulePage)
const loadGuestPage = () => import('@/pages/guest').then((m) => m.GuestPage)

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAMES.all } },
  { path: '/all', name: ROUTE_NAMES.all, component: loadSchedulePage },
  { path: '/p/:id', name: ROUTE_NAMES.participant, component: loadSchedulePage, props: true },
  { path: '/guest', name: ROUTE_NAMES.guest, component: loadGuestPage },
  {
    path: '/:pathMatch(.*)*',
    name: ROUTE_NAMES.notFound,
    component: () => import('@/pages/not-found').then((m) => m.NotFoundPage),
  },
]

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
  if (device.role === 'guest') return to.name === ROUTE_NAMES.guest ? true : { name: ROUTE_NAMES.guest }
  if (to.name === ROUTE_NAMES.guest) return { name: ROUTE_NAMES.all }
  return true
})
