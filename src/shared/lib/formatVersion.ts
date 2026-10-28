const RANGE_PREFIX = /^[\s^~>=<v]+/

/**
 * Turns a semver range from package.json into a readable version: "^3.5.1" → "3.5.1".
 * Returns `fallback` for missing values.
 */
export function formatVersion(range: string | undefined, fallback = '—'): string {
  const version = range?.replace(RANGE_PREFIX, '').trim()
  return version ? version : fallback
}
