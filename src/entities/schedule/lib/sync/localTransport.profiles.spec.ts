import { afterEach, describe, expect, it, vi } from 'vitest'

import { LocalTransport } from './localTransport'

const KEY = 'e|2026-01-05'
const mark = { status: 'done', by: 'participant', at: 5 } as const

const open: LocalTransport[] = []
async function make(channel: string) {
  const t = new LocalTransport()
  open.push(t)
  await t.connect(channel)
  return t
}

afterEach(() => open.splice(0).forEach((t) => t.disconnect()))

describe('LocalTransport profiles and completions', () => {
  it('round-trips profiles', async () => {
    const [a, b] = [await make('household-profiles-test-1'), await make('household-profiles-test-1')]
    const cb = vi.fn()
    b.onProfiles(cb)
    await a.pushProfile('ruslan', { avatar: 'data:image/webp;base64,AAAA', alarmSound: 'bell' })
    await vi.waitFor(() =>
      expect(cb).toHaveBeenLastCalledWith({ ruslan: { avatar: 'data:image/webp;base64,AAAA', alarmSound: 'bell' } }),
    )
    await a.pushProfile('ruslan', {})
    await vi.waitFor(() => expect(cb).toHaveBeenLastCalledWith({ ruslan: {} }))
  })

  it('round-trips completions and their removal', async () => {
    const [a, b] = [await make('household-marks-test-0001'), await make('household-marks-test-0001')]
    const cb = vi.fn()
    a.onCompletions(cb)
    await b.setCompletion(KEY, mark)
    await vi.waitFor(() => expect(cb).toHaveBeenLastCalledWith({ [KEY]: mark }))
    await b.setCompletion(KEY, null)
    await vi.waitFor(() => expect(cb).toHaveBeenLastCalledWith({}))
  })

  it('gives a late joiner profiles and completions', async () => {
    const channel = 'household-late-marks-001'
    const a = await make(channel)
    await a.pushProfile('ruslan', { alarmSound: 'beep' })
    await a.setCompletion(KEY, mark)
    const b = new LocalTransport()
    open.push(b)
    const profiles = vi.fn()
    const marks = vi.fn()
    b.onProfiles(profiles)
    b.onCompletions(marks)
    await b.connect(channel)
    await vi.waitFor(() => expect(profiles).toHaveBeenLastCalledWith({ ruslan: { alarmSound: 'beep' } }))
    await vi.waitFor(() => expect(marks).toHaveBeenLastCalledWith({ [KEY]: mark }))
  })

  it('isolates households', async () => {
    const a = await make('household-iso-marks-0001')
    const b = await make('household-iso-marks-0002')
    const cb = vi.fn()
    b.onCompletions(cb)
    await a.setCompletion(KEY, mark)
    await new Promise((r) => setTimeout(r, 50))
    expect(cb).not.toHaveBeenCalled()
  })
})
