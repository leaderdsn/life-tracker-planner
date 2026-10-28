export function normalizeTitle(input: string): string {
  let s = input
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/,\s*$/, '')
    .trim()
  const letters = s.replace(/[^\p{L}]/gu, '')
  if (letters.length > 4 && letters === letters.toUpperCase() && letters !== letters.toLowerCase()) {
    s = s.toLowerCase()
  }
  return s.charAt(0).toUpperCase() + s.slice(1)
}
