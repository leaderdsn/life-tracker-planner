import { describe, expect, it } from 'vitest'

import {
  addDays,
  fromMinutes,
  minutes,
  normalizeTime,
  parseIsoDate,
  startOfWeek,
  toIsoDate,
  validateTime,
  weekdayOf,
} from './time'

describe('normalizeTime', () => {
  it.each([
    ['8.30', '08:30'],
    ['8:30', '08:30'],
    ['8,30', '08:30'],
    ['8-30', '08:30'],
    ['8 30', '08:30'],
    ['830', '08:30'],
    ['0830', '08:30'],
    ['8', '08:00'],
    ['08:30:00', '08:30'],
    ['  9:05  ', '09:05'],
    ['23:59', '23:59'],
    [8.3, '08:30'],
    [830, '08:30'],
    [0.375, '09:00'],
    [0, '00:00'],
    [new Date(2024, 0, 1, 7, 5), '07:05'],
  ])('%j -> %j', (input, expected) => {
    expect(normalizeTime(input)).toBe(expected)
  })

  it.each(['25.70', 'abc', '', '24:00', '8:60', null, undefined, {}, -1, NaN, new Date('x')])(
    'rejects %j',
    (input) => {
      expect(normalizeTime(input)).toBeNull()
    },
  )
})

describe('validateTime', () => {
  it.each([
    ['8.30', { value: '08:30' }],
    ['abc', { error: 'Не понимаю время «abc»' }],
    ['25.70', { error: 'Время 25:70 не существует' }],
    ['  ', { error: 'Укажите время' }],
    [undefined, { error: 'Укажите время' }],
  ])('%j', (input, expected) => {
    expect(validateTime(input)).toEqual(expected)
  })
})

describe('minutes / fromMinutes', () => {
  it.each([
    ['00:00', 0],
    ['07:15', 435],
    ['23:59', 1439],
  ])('%s <-> %d', (t, n) => {
    expect(minutes(t)).toBe(n)
    expect(fromMinutes(n)).toBe(t)
  })

  it('wraps around midnight', () => {
    expect(fromMinutes(1450)).toBe('00:10')
    expect(fromMinutes(-10)).toBe('23:50')
  })
})

describe('dates', () => {
  it('round-trips iso dates in local time', () => {
    expect(toIsoDate(parseIsoDate('2024-03-05'))).toBe('2024-03-05')
    expect(parseIsoDate('2024-03-05').getHours()).toBe(0)
  })

  it.each([
    ['2024-03-04', '2024-03-04'],
    ['2024-03-06', '2024-03-04'],
    ['2024-03-10', '2024-03-04'],
    ['2024-03-11', '2024-03-11'],
  ])('startOfWeek(%s) = %s', (d, expected) => {
    expect(toIsoDate(startOfWeek(parseIsoDate(d)))).toBe(expected)
  })

  it.each([
    ['2024-02-28', 2, '2024-03-01'],
    ['2024-01-01', -1, '2023-12-31'],
  ])('addDays(%s, %d) = %s', (d, n, expected) => {
    expect(toIsoDate(addDays(parseIsoDate(d), n))).toBe(expected)
  })

  it.each([
    ['2024-03-04', 'mon'],
    ['2024-03-09', 'sat'],
    ['2024-03-10', 'sun'],
  ])('weekdayOf(%s) = %s', (d, expected) => {
    expect(weekdayOf(parseIsoDate(d))).toBe(expected)
  })
})
