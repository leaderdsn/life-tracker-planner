import { describe, expect, it } from 'vitest'

import { initialLabels } from './participantView'

import type { Participant } from '../model/types'

const make = (names: string[]): Participant[] =>
  names.map((name, order) => ({ id: name, name, color: '#fff', order }))

describe('initialLabels', () => {
  it('использует кратчайший уникальный префикс', () => {
    expect(initialLabels(make(['Руслан', 'Ратмир', 'Вера', 'Яна']))).toEqual({
      Руслан: 'Ру',
      Ратмир: 'Ра',
      Вера: 'В',
      Яна: 'Я',
    })
  })

  it('не регистрозависим и приводит к виду «Ру»', () => {
    expect(initialLabels(make(['РУСЛАН', 'ратмир']))).toEqual({ РУСЛАН: 'Ру', ратмир: 'Ра' })
  })

  it('растёт, пока одно имя является началом другого', () => {
    expect(initialLabels(make(['Ан', 'Анна']))).toEqual({ Ан: 'Ан', Анна: 'Анн' })
  })

  it('один участник получает одну букву', () => {
    expect(initialLabels(make(['Мария']))).toEqual({ Мария: 'М' })
  })
})
