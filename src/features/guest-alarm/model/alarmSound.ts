import type { AlarmSound, Participant, ScheduleEvent } from '@/entities/schedule'

/** A shared event rings with the first participant's own sound; without one, the admin default. */
export function alarmSoundFor(
  event: Pick<ScheduleEvent, 'participantIds'>,
  participants: Pick<Participant, 'id' | 'alarmSound'>[],
  fallback: AlarmSound,
): AlarmSound {
  for (const id of event.participantIds) {
    const sound = participants.find((p) => p.id === id)?.alarmSound
    if (sound) return sound
  }
  return fallback
}
