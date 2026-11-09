import { describe, expect, it } from 'vitest'

import { normalizeHex, readableInk, readableInkForAll } from './color'

describe('readableInk', () => {
  it('тёмный текст на светлом', () => expect(readableInk('#ffe9f0')).toBe('#1f2937'))
  it('светлый текст на тёмном', () => expect(readableInk('#10203a')).toBe('#ffffff'))
  it('средний цвет выбирает более контрастный', () => {
    expect(readableInk('#ff0000')).toBe('#ffffff')
    expect(readableInk('#00cc66')).toBe('#1f2937')
  })
  it('мусор даёт тёмный', () => expect(readableInk('nope')).toBe('#1f2937'))
})

describe('normalizeHex', () => {
  it('разворачивает короткую запись и понижает регистр', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc')
    expect(normalizeHex('A1B2C3')).toBe('#a1b2c3')
  })
  it('отклоняет неверный формат', () => {
    expect(normalizeHex('#abcd')).toBeNull()
    expect(normalizeHex('#ggg')).toBeNull()
  })
})

describe('readableInkForAll', () => {
  it('пустой список даёт null', () => expect(readableInkForAll([])).toBeNull())
})
