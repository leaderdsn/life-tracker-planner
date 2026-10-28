import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import { useDeviceStore } from '@/entities/schedule'
import { ROUTE_NAMES } from '@/shared/config'

import { launchRouteFromSearch, router } from './router'

async function visit(path: string) {
  await router.push(path)
  return router.currentRoute.value
}

beforeEach(async () => {
  localStorage.clear()
  setActivePinia(createPinia())
  await router.replace('/nowhere')
})

describe('launchRouteFromSearch', () => {
  it.each([
    ['join', '?join=house1', '/join?h=house1'],
    ['guest', '?guest=house2', '/guest?h=house2'],
    ['none', '', null],
    ['unrelated query', '?utm=1', null],
    ['empty value', '?join=', null],
    ['url-encoded id', '?join=a%2Fb%20c%26d', '/join?h=a%2Fb%20c%26d'],
    ['join wins over guest', '?guest=g&join=j', '/join?h=j'],
  ])('%s', (_name, search, expected) => {
    expect(launchRouteFromSearch(search)).toBe(expected)
  })
})

describe('router guards by role', () => {
  it('участник не открывает чужие и общие страницы, в том числе по ссылке', async () => {
    const device = useDeviceStore()
    device.setRole('participant')
    device.$patch({ participantId: 'anna' })

    expect((await visit('/all')).params.id).toBe('anna')
    expect((await visit('/p/boris')).params.id).toBe('anna')
    expect((await visit('/guest')).name).toBe(ROUTE_NAMES.participant)
    expect((await visit('/p/anna')).name).toBe(ROUTE_NAMES.participant)
  })

  it('без входа участник попадает только на экран входа', async () => {
    useDeviceStore().logout()
    expect((await visit('/all')).name).toBe(ROUTE_NAMES.join)
    expect((await visit('/p/anna')).name).toBe(ROUTE_NAMES.join)
  })

  it('администратор не остаётся на экране входа', async () => {
    expect((await visit('/join')).name).toBe(ROUTE_NAMES.all)
  })

  it('ссылка-приглашение запоминает дом и просит войти', async () => {
    const device = useDeviceStore()
    const route = await visit('/join?h=house1')
    expect(route.name).toBe(ROUTE_NAMES.join)
    expect(device.householdId).toBe('house1')
    expect(device.needsLogin).toBe(true)
  })
})
