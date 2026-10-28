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

export function showNotification(message: string): boolean {
  if (!canShowNotification()) return false
  try {
    new Notification('Расписание', { body: message })
    return true
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
    return false
  }
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
