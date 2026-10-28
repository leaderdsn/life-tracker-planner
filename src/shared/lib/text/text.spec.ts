import { describe, expect, it } from 'vitest'

import { normalizeTitle } from './text'

describe('normalizeTitle', () => {
  it.each([
    ['  вокал  ', 'Вокал'],
    ['Завтрак,гигиена ,  уборка', 'Завтрак, гигиена, уборка'],
    ['Школа\nматематика', 'Школа математика'],
    ['ШКОЛА МАТЕМАТИКА', 'Школа математика'],
    ['ДДТ', 'ДДТ'],
    ['ШКОЛА', 'Школа'],
    ['Урок  английского', 'Урок английского'],
    ['', ''],
    ['Плавание,', 'Плавание'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeTitle(input)).toBe(expected)
  })
})
