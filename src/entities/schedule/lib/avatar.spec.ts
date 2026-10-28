import { describe, expect, it } from 'vitest'

import { AVATAR_MAX_BYTES, centerCrop, dataUrlBytes, pickEncoding } from './avatar'

describe('centerCrop', () => {
  it.each([
    [400, 200, { sx: 100, sy: 0, side: 200 }],
    [200, 400, { sx: 0, sy: 100, side: 200 }],
    [128, 128, { sx: 0, sy: 0, side: 128 }],
    [101, 50, { sx: 26, sy: 0, side: 50 }],
  ])('%i x %i', (w, h, rect) => {
    expect(centerCrop(w, h)).toEqual(rect)
  })
})

describe('dataUrlBytes', () => {
  it.each([
    ['data:x;base64,QUJD', 3],
    ['data:x;base64,QUI=', 2],
    ['data:x;base64,QQ==', 1],
  ])('%s', (url, bytes) => {
    expect(dataUrlBytes(url)).toBe(bytes)
  })
})

describe('pickEncoding', () => {
  const big = (type: string) => `data:${type};base64,${'A'.repeat(AVATAR_MAX_BYTES * 2)}`
  const small = (type: string) => `data:${type};base64,QUJD`

  it('prefers webp at the first quality', () => {
    expect(pickEncoding((t) => small(t))).toBe(small('image/webp'))
  })

  it('lowers quality until the result fits', () => {
    expect(pickEncoding((t, q) => (q <= 0.5 ? small(t) : big(t)))).toBe(small('image/webp'))
  })

  it('falls back to jpeg when webp is unsupported', () => {
    expect(pickEncoding((t) => (t === 'image/webp' ? 'data:image/png;base64,AAAA' : small(t)))).toBe(small('image/jpeg'))
  })

  it('throws when nothing fits', () => {
    expect(() => pickEncoding((t) => big(t))).toThrow()
  })
})
