import { describe, expect, it } from 'vitest'

import { alarmSoundFor } from './alarmSound'

import type { AlarmSound } from '@/entities/schedule'

const people: { id: string; alarmSound?: AlarmSound }[] = [
  { id: 'a', alarmSound: 'bell' },
  { id: 'b' },
  { id: 'c', alarmSound: 'beep' },
]

describe('alarmSoundFor', () => {
  it.each<[string, string[], AlarmSound]>([
    ['own sound', ['a'], 'bell'],
    ['first participant wins', ['c', 'a'], 'beep'],
    ['skips participants without a sound', ['b', 'c'], 'beep'],
    ['falls back to the default', ['b'], 'chime'],
    ['unknown participant', ['zzz'], 'chime'],
  ])('%s', (_name, ids, expected) => {
    expect(alarmSoundFor({ participantIds: ids }, people, 'chime')).toBe(expected)
  })
})
