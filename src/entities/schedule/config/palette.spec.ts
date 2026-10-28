import { describe, expect, it } from 'vitest'

import { SOUND_GENERATORS, soundDuration } from '@/shared/lib'

import { migrate } from '../lib/persistence'

import { ALARM_SOUNDS, COLOR_NAMES, PASTEL_COLORS, SOUND_GROUPS, SOUND_LABELS } from './schedule'

const INK = '#1f2937'

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05)
}

describe('PASTEL_COLORS', () => {
  it('has 16 unique colors starting with the original eight', () => {
    expect(PASTEL_COLORS).toHaveLength(16)
    expect(new Set(PASTEL_COLORS.map((c) => c.toLowerCase())).size).toBe(16)
    expect(PASTEL_COLORS.slice(0, 2)).toEqual(['#FCE8B2', '#CFE2FF'])
  })

  it.each(PASTEL_COLORS)('keeps dark text readable on %s', (color) => {
    expect(contrast(INK, color)).toBeGreaterThanOrEqual(4.5)
  })

  it('names every color in Russian', () => {
    for (const color of PASTEL_COLORS) expect(COLOR_NAMES[color]).toMatch(/^[А-Яа-яЁё]+$/)
    expect(new Set(PASTEL_COLORS.map((c) => COLOR_NAMES[c])).size).toBe(16)
  })
})

describe('ALARM_SOUNDS', () => {
  it.each(ALARM_SOUNDS)('%s has a generator and a label', (sound) => {
    expect(SOUND_GENERATORS[sound]().length).toBeGreaterThan(0)
    expect(SOUND_LABELS[sound]).toBeTruthy()
    if (['bell', 'beep'].includes(sound)) return
    expect(soundDuration(sound)).toBeGreaterThanOrEqual(0.8)
    expect(soundDuration(sound)).toBeLessThanOrEqual(2.6)
  })

  it('lists each sound in exactly one group', () => {
    expect(SOUND_GROUPS.flatMap((g) => g.sounds).sort()).toEqual([...ALARM_SOUNDS].sort())
    expect(new Set(ALARM_SOUNDS).size).toBe(ALARM_SOUNDS.length)
    expect(Object.keys(SOUND_GENERATORS).sort()).toEqual([...ALARM_SOUNDS].sort())
  })

  it('falls back for an unknown participant sound and keeps known ones', () => {
    const snapshot = migrate({
      version: 2,
      participants: [
        { id: 'a', name: 'А', color: '#fff', alarmSound: 'siren' },
        { id: 'b', name: 'Б', color: '#fff', alarmSound: 'harp' },
      ],
      events: [],
      settings: { alarmSound: 'siren' },
    })
    expect(snapshot.participants[0]?.alarmSound).toBeUndefined()
    expect(snapshot.participants[1]?.alarmSound).toBe('harp')
    expect(snapshot.settings.alarmSound).toBe('chime')
  })
})
