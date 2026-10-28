import { describe, expect, it } from 'vitest'

import { completionKey, mergeCompletions } from './completionSync'

import type { Completion, SyncedCompletion } from '../model/types'

const done = (eventId: string, date = '2026-01-05'): Completion => ({ eventId, date, status: 'done' })
const mark = (status: 'done' | 'skipped', at: number): SyncedCompletion => ({ status, by: 'participant', at })
const state = (stamps: Record<string, number> = {}, known: string[] = []) => ({ stamps, known: new Set(known) })
const K = completionKey('e1', '2026-01-05')

describe('mergeCompletions', () => {
  it('adds remote marks', () => {
    expect(mergeCompletions([], { [K]: mark('done', 5) }, state())).toEqual([done('e1')])
  })

  it('takes the newer side per key', () => {
    const remote = { [K]: mark('skipped', 10) }
    expect(mergeCompletions([done('e1')], remote, state({ [K]: 5 }))).toEqual([
      { eventId: 'e1', date: '2026-01-05', status: 'skipped' },
    ])
    expect(mergeCompletions([done('e1')], remote, state({ [K]: 20 }))).toEqual([done('e1')])
  })

  it('does not resurrect a mark cleared locally after it was synced', () => {
    expect(mergeCompletions([], { [K]: mark('done', 5) }, state({ [K]: 9 }, [K]))).toEqual([])
  })

  it('drops a mark that was cleared remotely', () => {
    expect(mergeCompletions([done('e1')], {}, state({}, [K]))).toEqual([])
  })

  it('keeps local marks never seen remotely', () => {
    expect(mergeCompletions([done('e1')], {}, state())).toEqual([done('e1')])
  })

  it('merges independent keys', () => {
    const k2 = completionKey('e2', '2026-01-06')
    expect(mergeCompletions([done('e1')], { [k2]: mark('done', 1) }, state())).toHaveLength(2)
  })

  it('ignores malformed keys', () => {
    expect(mergeCompletions([], { nokey: mark('done', 1) }, state())).toEqual([])
  })
})
