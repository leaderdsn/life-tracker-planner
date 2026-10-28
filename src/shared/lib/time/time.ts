const pad = (n: number) => String(n).padStart(2, '0')

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

type Parts = { h: number; m: number }

function partsFromString(raw: string): Parts | null {
  const s = raw.trim()
  const sep = /^(\d{1,2})[.:,\-\s]+(\d{1,2})(?::\d{2})?$/.exec(s)
  if (sep) return { h: Number(sep[1]), m: Number(sep[2]) }
  if (/^\d{1,2}$/.test(s)) return { h: Number(s), m: 0 }
  const compact = /^(\d{1,2})(\d{2})$/.exec(s)
  if (compact) return { h: Number(compact[1]), m: Number(compact[2]) }
  return null
}

function partsFromNumber(n: number): Parts | null {
  if (!Number.isFinite(n) || n < 0) return null
  if (n < 1) {
    // Spreadsheet day fraction
    const total = Math.round(n * 1440) % 1440
    return { h: Math.floor(total / 60), m: total % 60 }
  }
  if (Number.isInteger(n)) return partsFromString(String(n))
  return partsFromString(n.toFixed(2))
}

function toParts(input: unknown): Parts | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : { h: input.getHours(), m: input.getMinutes() }
  }
  if (typeof input === 'number') return partsFromNumber(input)
  if (typeof input === 'string') return partsFromString(input)
  return null
}

const inRange = ({ h, m }: Parts) => h >= 0 && h <= 23 && m >= 0 && m <= 59

export function normalizeTime(input: unknown): string | null {
  const parts = toParts(input)
  return parts && inRange(parts) ? `${pad(parts.h)}:${pad(parts.m)}` : null
}

export function validateTime(input: unknown): { value: string } | { error: string } {
  if (input === undefined || input === null || (typeof input === 'string' && !input.trim())) {
    return { error: 'Укажите время' }
  }
  const parts = toParts(input)
  if (!parts) return { error: `Не понимаю время «${typeof input === 'string' ? input.trim() : JSON.stringify(input)}»` }
  if (!inRange(parts)) return { error: `Время ${pad(parts.h)}:${pad(parts.m)} не существует` }
  return { value: `${pad(parts.h)}:${pad(parts.m)}` }
}

export function minutes(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(n: number): string {
  const total = ((Math.round(n) % 1440) + 1440) % 1440
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseIsoDate(s: string): Date {
  const [y = 1970, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

export function startOfWeek(d: Date): Date {
  const offset = (d.getDay() + 6) % 7
  return addDays(d, -offset)
}

export function weekdayOf(d: Date): string {
  return WEEKDAY_KEYS[d.getDay()] as string
}
