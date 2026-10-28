import { describe, expect, it } from 'vitest'

import { generateHouseholdId } from './householdId'
import { hashPin, verifyPin } from './pin'

describe('hashPin', () => {
  it('returns SHA-256 hex', async () => {
    expect(await hashPin('1234')).toBe('03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4')
  })
})

describe('verifyPin', () => {
  it.each<[string, string, boolean]>([
    ['correct pin', '1234', true],
    ['wrong pin', '4321', false],
    ['empty pin', '', false],
  ])('%s', async (_name, pin, expected) => {
    expect(await verifyPin(pin, await hashPin('1234'))).toBe(expected)
  })

  it('allows anything when no PIN is set', async () => {
    expect(await verifyPin('', null)).toBe(true)
  })
})

describe('generateHouseholdId', () => {
  it('is long, base62 and random', () => {
    const a = generateHouseholdId()
    expect(a).toMatch(/^[0-9A-Za-z]{24}$/)
    expect(generateHouseholdId()).not.toBe(a)
  })
})
