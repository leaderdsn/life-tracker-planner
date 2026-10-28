export type AlarmSoundName = 'chime' | 'beep' | 'bell'

type Note = { freq: number; at: number; length: number; type?: OscillatorType; gain?: number }

const LOOP_INTERVAL_MS = 3000
const SILENT = 0.0001

let context: AudioContext | null = null
let loopTimer: ReturnType<typeof setInterval> | undefined

function getContext(): AudioContext | null {
  if (context) return context
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  context = new Ctor()
  return context
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))

function notesFor(sound: AlarmSoundName): Note[] {
  if (sound === 'beep') {
    return [0, 0.22, 0.44].map((at) => ({ freq: 880, at, length: 0.14, type: 'square', gain: 0.25 }))
  }
  if (sound === 'bell') {
    const partials = [
      { ratio: 1, gain: 1 },
      { ratio: 2.76, gain: 0.45 },
      { ratio: 5.4, gain: 0.22 },
      { ratio: 8.93, gain: 0.1 },
    ]
    return [0, 0.9].flatMap((at) =>
      partials.map(({ ratio, gain }) => ({ freq: 523.25 * ratio, at, length: 2.2, gain: gain * 0.4 })),
    )
  }
  return [659.25, 783.99, 1046.5].map((freq, index) => ({ freq, at: index * 0.18, length: 1.2, gain: 0.5 }))
}

function schedule(ctx: AudioContext, sound: AlarmSoundName, volume: number) {
  const master = ctx.createGain()
  master.gain.value = clamp01(volume)
  master.connect(ctx.destination)
  const origin = ctx.currentTime + 0.02

  for (const note of notesFor(sound)) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    const start = origin + note.at
    osc.type = note.type ?? 'sine'
    osc.frequency.value = note.freq
    env.gain.setValueAtTime(SILENT, start)
    env.gain.linearRampToValueAtTime(note.gain ?? 0.5, start + 0.012)
    env.gain.exponentialRampToValueAtTime(SILENT, start + note.length)
    osc.connect(env)
    env.connect(master)
    osc.start(start)
    osc.stop(start + note.length + 0.05)
  }
}

/** Must be called from a user gesture; browsers keep audio suspended until then. */
export async function unlockAudio(): Promise<boolean> {
  const ctx = getContext()
  if (!ctx) return false
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume()
    } catch {
      return false
    }
  }
  return ctx.state === 'running'
}

export function playOnce(sound: AlarmSoundName, volume: number): void {
  const ctx = getContext()
  if (!ctx) return
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  schedule(ctx, sound, volume)
}

export function playLoop(sound: AlarmSoundName, volume: number, intervalMs = LOOP_INTERVAL_MS): void {
  stopLoop()
  playOnce(sound, volume)
  loopTimer = setInterval(() => playOnce(sound, volume), intervalMs)
}

export function stopLoop(): void {
  clearInterval(loopTimer)
  loopTimer = undefined
}

export function isLooping(): boolean {
  return loopTimer !== undefined
}
