import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useClipboard } from './useClipboard'

describe('useClipboard', () => {
  const writeText = vi.fn<(text: string) => Promise<void>>()

  beforeEach(() => {
    vi.useFakeTimers()
    writeText.mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('копирует текст и выставляет флаг copied', async () => {
    const { copied, copy } = useClipboard()

    const result = await copy('pnpm dev')

    expect(result).toBe(true)
    expect(writeText).toHaveBeenCalledWith('pnpm dev')
    expect(copied.value).toBe(true)
  })

  it('сбрасывает флаг copied по таймауту', async () => {
    const { copied, copy } = useClipboard(1000)

    await copy('text')
    vi.advanceTimersByTime(1000)

    expect(copied.value).toBe(false)
  })

  it('возвращает false, когда буфер обмена недоступен', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    const { copied, copy } = useClipboard()

    const result = await copy('text')

    expect(result).toBe(false)
    expect(copied.value).toBe(false)
  })
})
