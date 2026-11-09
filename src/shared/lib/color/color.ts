export const INK_DARK = '#1f2937'
export const INK_LIGHT = '#ffffff'

export function normalizeHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim())
  if (!match) return null
  const digits = (match[1] as string).toLowerCase()
  const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits
  return `#${full}`
}

function rgbOf(hex: string): [number, number, number] | null {
  const full = normalizeHex(hex)
  if (!full) return null
  return [1, 3, 5].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as [number, number, number]
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function readableInk(hex: string): string {
  const rgb = rgbOf(hex)
  if (!rgb) return INK_DARK
  const l = luminance(rgb)
  const dark = (l + 0.05) / (luminance(rgbOf(INK_DARK) as [number, number, number]) + 0.05)
  const light = 1.05 / (l + 0.05)
  return dark >= light ? INK_DARK : INK_LIGHT
}

/** Ink for a surface painted with several colors: judged on their average. */
export function readableInkForAll(colors: readonly string[]): string | null {
  const all = colors.map(rgbOf).filter((c): c is [number, number, number] => c !== null)
  if (all.length === 0) return null
  const avg = [0, 1, 2].map((i) => Math.round(all.reduce((s, c) => s + (c[i] as number), 0) / all.length))
  return readableInk(`#${avg.map((v) => v.toString(16).padStart(2, '0')).join('')}`)
}
