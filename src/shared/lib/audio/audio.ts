export type AlarmSoundName =
  | 'chime'
  | 'bell'
  | 'marimba'
  | 'xylophone'
  | 'harp'
  | 'piano'
  | 'cuckoo'
  | 'soft'
  | 'birds'
  | 'drops'
  | 'beep'
  | 'digital'

export type Note = {
  freq: number
  at: number
  length: number
  type?: OscillatorType
  gain?: number
  attack?: number
  /** target frequency of a glide over the note */
  to?: number
}

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

const C5 = 523.25
const E5 = 659.25
const G5 = 783.99
const A5 = 880
const C6 = 1046.5

/** a struck tone: the fundamental plus a quickly fading overtone */
function struck(freq: number, at: number, length: number, gain: number, overtone: number): Note[] {
  return [
    { freq, at, length, gain },
    { freq: freq * overtone, at, length: length * 0.35, gain: gain * 0.35 },
  ]
}

const BELL_PARTIALS = [
  { ratio: 1, gain: 1 },
  { ratio: 2.76, gain: 0.45 },
  { ratio: 5.4, gain: 0.22 },
  { ratio: 8.93, gain: 0.1 },
]

const DROPS: [number, number][] = [
  [0, 700],
  [0.45, 900],
  [0.85, 600],
  [1.35, 800],
]

const chirp = (at: number, freq: number, to: number): Note => ({ freq, to, at, length: 0.11, gain: 0.3, attack: 0.01 })

export const SOUND_GENERATORS: Readonly<Record<AlarmSoundName, () => Note[]>> = {
  chime: () => [E5, G5, C6].map((freq, index) => ({ freq, at: index * 0.18, length: 1.2, gain: 0.5 })),
  bell: () =>
    [0, 0.9].flatMap((at) =>
      BELL_PARTIALS.map(({ ratio, gain }) => ({ freq: C5 * ratio, at, length: 2.2, gain: gain * 0.4 })),
    ),
  marimba: () => [C5, E5, G5, E5, C6].flatMap((freq, i) => struck(freq, i * 0.22, 0.55, 0.55, 4)),
  xylophone: () => [G5, C6, E5 * 2, G5 * 2, E5 * 2, C6].flatMap((freq, i) => struck(freq, i * 0.13, 0.4, 0.4, 3)),
  harp: () =>
    [C5, E5, G5, C6, E5 * 2, G5 * 2].flatMap((freq, i): Note[] => [
      { freq, at: i * 0.14, length: 1.1, gain: 0.4, type: 'triangle' },
      { freq: freq * 2, at: i * 0.14, length: 0.4, gain: 0.1 },
    ]),
  piano: () =>
    [C5, E5, G5, C6].flatMap((freq, i): Note[] => [
      { freq, at: i * 0.32, length: 1.3, gain: 0.45, type: 'triangle', attack: 0.006 },
      { freq: freq * 2, at: i * 0.32, length: 0.7, gain: 0.14 },
      { freq: freq * 3, at: i * 0.32, length: 0.3, gain: 0.06 },
    ]),
  cuckoo: () =>
    [0, 0.8].flatMap((base): Note[] => [
      { freq: G5, at: base, length: 0.32, gain: 0.5, attack: 0.03 },
      { freq: E5, at: base + 0.4, length: 0.4, gain: 0.5, attack: 0.03 },
    ]),
  soft: () => [
    { freq: 392, at: 0, length: 2, gain: 0.45, attack: 0.5, to: C5 },
    { freq: 784, at: 0.1, length: 1.9, gain: 0.12, attack: 0.6, to: C6 },
  ],
  birds: () => [
    chirp(0, 2600, 3600),
    chirp(0.16, 2800, 3900),
    chirp(0.32, 3000, 2400),
    chirp(0.8, 2400, 3400),
    chirp(0.95, 3200, 4000),
    chirp(1.1, 3800, 2600),
    chirp(1.26, 2600, 3500),
  ],
  drops: () =>
    DROPS.flatMap(([at, freq]): Note[] => [
      { freq, to: freq * 2, at, length: 0.16, gain: 0.5, attack: 0.005 },
      { freq: freq * 0.9, to: freq * 1.8, at: at + 0.14, length: 0.2, gain: 0.12, attack: 0.005 },
    ]),
  beep: () => [0, 0.22, 0.44].map((at): Note => ({ freq: A5, at, length: 0.14, type: 'square', gain: 0.25 })),
  digital: () =>
    [0, 0.5, 1, 1.5].flatMap((base) =>
      [0, 0.12, 0.24, 0.36].map((offset): Note => ({
        freq: 1760,
        at: base + offset,
        length: 0.07,
        type: 'square',
        gain: 0.16,
      })),
    ),
}

export function soundDuration(sound: AlarmSoundName): number {
  return Math.max(...SOUND_GENERATORS[sound]().map((note) => note.at + note.length))
}

function schedule(ctx: AudioContext, sound: AlarmSoundName, volume: number) {
  const master = ctx.createGain()
  master.gain.value = clamp01(volume)
  master.connect(ctx.destination)
  const origin = ctx.currentTime + 0.02
  const generate = SOUND_GENERATORS[sound] ?? SOUND_GENERATORS.chime

  for (const note of generate()) {
    const osc = ctx.createOscillator()
    const env = ctx.createGain()
    const start = origin + note.at
    osc.type = note.type ?? 'sine'
    osc.frequency.setValueAtTime(note.freq, start)
    if (note.to) osc.frequency.exponentialRampToValueAtTime(note.to, start + note.length * 0.8)
    env.gain.setValueAtTime(SILENT, start)
    env.gain.linearRampToValueAtTime(note.gain ?? 0.5, start + Math.min(note.attack ?? 0.012, note.length / 2))
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
