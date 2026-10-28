import { describe, expect, it } from 'vitest'

import { canEdit, canToggle } from './permissions'

import type { DeviceRole } from '../model/types'

const event = { participantIds: ['a', 'b'] }

describe('canToggle', () => {
  it.each<[DeviceRole, string | null, boolean]>([
    ['admin', null, true],
    ['participant', 'a', true],
    ['participant', 'b', true],
    ['participant', 'c', false],
    ['participant', null, false],
    ['guest', 'a', false],
  ])('%s as %s -> %s', (role, pid, expected) => {
    expect(canToggle(role, pid, event)).toBe(expected)
  })

  it('rejects a missing event', () => {
    expect(canToggle('admin', null, undefined)).toBe(false)
  })
})

describe('canEdit', () => {
  it.each<[DeviceRole, boolean]>([
    ['admin', true],
    ['participant', false],
    ['guest', false],
  ])('%s -> %s', (role, expected) => {
    expect(canEdit(role)).toBe(expected)
  })
})
