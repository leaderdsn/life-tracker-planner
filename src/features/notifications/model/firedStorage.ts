export const FIRED_STORAGE_KEY = 'life-tracker:fired'

const KEEP_MS = 2 * 24 * 60 * 60 * 1000

type Fired = Record<string, number>

export function loadFired(now: number): Fired {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(FIRED_STORAGE_KEY) ?? '{}')
    if (typeof raw !== 'object' || raw === null) return {}
    return Object.fromEntries(
      Object.entries(raw).filter(([, at]) => typeof at === 'number' && now - at <= KEEP_MS),
    )
  } catch {
    return {}
  }
}

export function saveFired(fired: Fired): void {
  try {
    localStorage.setItem(FIRED_STORAGE_KEY, JSON.stringify(fired))
  } catch {
    // Without storage reminders may repeat after a reload; nothing else to do.
  }
}
