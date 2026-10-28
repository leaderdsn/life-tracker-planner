import type { Participant } from '../model/types'

export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

export function initialsOf(participants: Participant[]): string {
  return participants.map((p) => initialOf(p.name)).join('·')
}

export function chipBackground(participants: Participant[]): string {
  const colors = participants.map((p) => p.color)
  if (colors.length === 0) return 'var(--app-surface-muted)'
  if (colors.length === 1) return colors[0] as string
  const step = 100 / colors.length
  const stops = colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`)
  return `linear-gradient(100deg, ${stops.join(', ')})`
}

/** participantId -> shortest prefix of the name that no other participant shares ("Ру", "Ра", "В"). */
export function initialLabels(participants: Participant[]): Record<string, string> {
  const names = participants.map((p) => p.name.trim().toLowerCase())
  const labels: Record<string, string> = {}
  participants.forEach((p, index) => {
    const own = names[index] ?? ''
    let length = 1
    while (length < own.length && names.some((other, i) => i !== index && other.startsWith(own.slice(0, length)))) {
      length += 1
    }
    const text = p.name.trim().slice(0, length)
    labels[p.id] = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  })
  return labels
}
