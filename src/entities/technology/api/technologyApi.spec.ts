import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchTechnologies, MOCK_LATENCY_MS } from './technologyApi'

describe('fetchTechnologies', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function load() {
    const promise = fetchTechnologies()
    await vi.advanceTimersByTimeAsync(MOCK_LATENCY_MS)
    return promise
  }

  it('подставляет установленные версии пакетов из package.json', async () => {
    const technologies = await load()
    const vue = technologies.find((t) => t.id === 'vue')

    expect(vue?.version).toMatch(/^\d+\.\d+\.\d+/)
  })

  it('помечает методологии без npm-пакета', async () => {
    const technologies = await load()
    const fsd = technologies.find((t) => t.id === 'fsd')

    expect(fsd?.version).toBe('методология')
  })

  it('возвращает уникальные id', async () => {
    const technologies = await load()
    const ids = technologies.map((t) => t.id)

    expect(new Set(ids).size).toBe(ids.length)
  })
})
