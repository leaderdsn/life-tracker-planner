import { describe, expect, it } from 'vitest'

import { mergeProfiles, toProfile, withoutProfile } from './profiles'

import type { Participant } from '../model/types'

const a: Participant = { id: 'a', name: 'Аня', color: '#fff', order: 0, pinHash: 'h', avatar: 'old', alarmSound: 'bell' }
const b: Participant = { id: 'b', name: 'Боря', color: '#fff', order: 1 }

describe('mergeProfiles', () => {
  it('lets the remote profile override avatar and sound', () => {
    const [x] = mergeProfiles([a], { a: { avatar: 'new', alarmSound: 'beep' } })
    expect(x).toMatchObject({ avatar: 'new', alarmSound: 'beep', pinHash: 'h', name: 'Аня' })
  })

  it('clears fields absent from the remote profile', () => {
    const [x] = mergeProfiles([a], { a: {} })
    expect(x?.avatar).toBeUndefined()
    expect(x?.alarmSound).toBeUndefined()
  })

  it('keeps participants without a profile untouched', () => {
    const merged = mergeProfiles([a, b], { b: { avatar: 'x' } })
    expect(merged[0]).toBe(a)
    expect(merged[1]?.avatar).toBe('x')
  })

  it('ignores profiles of unknown participants', () => {
    expect(mergeProfiles([b], { zzz: { avatar: 'x' } })).toEqual([b])
  })
})

describe('profile fields', () => {
  it('toProfile keeps only set fields', () => {
    expect(toProfile(a)).toEqual({ avatar: 'old', alarmSound: 'bell' })
    expect(toProfile(b)).toEqual({})
  })

  it('withoutProfile strips them from the shared copy', () => {
    expect(withoutProfile(a)).toEqual({ id: 'a', name: 'Аня', color: '#fff', order: 0, pinHash: 'h' })
  })
})
