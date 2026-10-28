import { describe, expect, it } from 'vitest'

import { generateHouseholdId } from './householdId'
import { hashParticipantPin, hashPin, verifyAdminPin, verifyParticipantPin, verifyPin } from './pin'

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

describe('participant PIN salt', () => {
  const hash = (pin: string, pid: string, h: string | null) => hashParticipantPin(pin, pid, h)

  it('differs per participant and household', async () => {
    const base = await hash('1234', 'a', 'hh')
    expect(base).not.toBe(await hash('1234', 'b', 'hh'))
    expect(base).not.toBe(await hash('1234', 'a', 'other'))
    expect(base).not.toBe(await hashPin('1234'))
  })

  it('is SHA-256 of household:participant:pin', async () => {
    expect(await hash('1234', 'a', 'hh')).toBe(await hashPin('hh:a:1234'))
    expect(await hash('1234', 'a', null)).toBe(await hashPin('local:a:1234'))
  })

  it.each<[string, string, string | null, boolean]>([
    ['right pin', '1234', 'hh', true],
    ['wrong pin', '1111', 'hh', false],
    ['other household', '1234', 'hh2', false],
  ])('verifyParticipantPin: %s', async (_n, pin, household, expected) => {
    expect(await verifyParticipantPin(pin, 'a', household, await hash('1234', 'a', 'hh'))).toBe(expected)
  })

  it('accepts a PIN set while the device was local', async () => {
    expect(await verifyParticipantPin('1234', 'a', 'hh', await hash('1234', 'a', null))).toBe(true)
  })

  it('passes without a hash and rejects another participant', async () => {
    expect(await verifyParticipantPin('', 'a', 'hh', null)).toBe(true)
    expect(await verifyParticipantPin('1234', 'b', 'hh', await hash('1234', 'a', 'hh'))).toBe(false)
  })
})

describe('verifyAdminPin', () => {
  it('checks the plain hash and allows an unset PIN', async () => {
    expect(await verifyAdminPin('1234', await hashPin('1234'))).toBe(true)
    expect(await verifyAdminPin('0000', await hashPin('1234'))).toBe(false)
    expect(await verifyAdminPin('', null)).toBe(true)
  })
})
