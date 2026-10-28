import { createRouter, createWebHashHistory } from 'vue-router'

import { ROUTE_NAMES } from '@/shared/config'

import type { RouteRecordRaw } from 'vue-router'

const loadSchedulePage = () => import('@/pages/schedule').then((m) => m.SchedulePage)

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: { name: ROUTE_NAMES.all } },
  { path: '/all', name: ROUTE_NAMES.all, component: loadSchedulePage },
  { path: '/p/:id', name: ROUTE_NAMES.participant, component: loadSchedulePage, props: true },
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
