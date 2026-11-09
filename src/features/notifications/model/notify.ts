export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function canShowNotification(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted'
}

export type ShowOptions = { tag?: string; silent?: boolean }

const TITLE = 'Расписание'

function showDirect(message: string, { tag, silent }: ShowOptions): boolean {
  try {
    new Notification(TITLE, { body: message, tag, silent })
    return true
  } catch {
    return false
  }
}

async function showViaWorker(message: string, { tag, silent }: ShowOptions): Promise<boolean> {
  try {
    if (!(await navigator.serviceWorker.getRegistration())) return false
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(TITLE, {
      body: message,
      tag,
      silent,
      icon: `${import.meta.env.BASE_URL}icon.svg`,
    })
    return true
  } catch {
    return false
  }
}

/** Returns false when no system notification can be shown, so the caller can fall back to a toast. */
export function showNotification(message: string, options: ShowOptions = {}): boolean {
  if (!canShowNotification()) return false
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    void showViaWorker(message, options).then((ok) => ok || showDirect(message, options))
    return true
  }
  return showDirect(message, options)
}

let audio: AudioContext | undefined

export function beep(): void {
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, audio.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.25)
    osc.connect(gain).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + 0.25)
  } catch {
    // Audio is blocked until the user interacts with the page.
  }
}
