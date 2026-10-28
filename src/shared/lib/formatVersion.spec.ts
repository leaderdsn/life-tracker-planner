import { describe, expect, it } from 'vitest'

import { formatVersion } from './formatVersion'

describe('formatVersion', () => {
  it.each([
    ['^3.5.1', '3.5.1'],
    ['~6.0.0', '6.0.0'],
    ['>=1.2.0', '1.2.0'],
    ['v2.0.0', '2.0.0'],
    ['4.1.0', '4.1.0'],
  ])('убирает префикс диапазона из "%s"', (range, expected) => {
    expect(formatVersion(range)).toBe(expected)
  })

  it('возвращает значение по умолчанию, когда версии нет', () => {
    expect(formatVersion(undefined)).toBe('—')
    expect(formatVersion('', 'n/a')).toBe('n/a')
  })
})
