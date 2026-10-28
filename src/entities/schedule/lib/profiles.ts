import type { Participant, ParticipantProfile } from '../model/types'

export const toProfile = ({ avatar, alarmSound }: ParticipantProfile): ParticipantProfile => ({
  ...(avatar ? { avatar } : {}),
  ...(alarmSound ? { alarmSound } : {}),
})

/** Profile fields travel separately from the schedule, so they are stripped before it is shared. */
export function withoutProfile(p: Participant): Participant {
  const rest = { ...p }
  delete rest.avatar
  delete rest.alarmSound
  return rest
}

/** A remote profile is the source of truth for its participant's avatar and sound. */
export function mergeProfiles(
  participants: Participant[],
  profiles: Record<string, ParticipantProfile>,
): Participant[] {
  return participants.map((p) => {
    const profile = profiles[p.id]
    return profile ? { ...withoutProfile(p), ...toProfile(profile) } : p
  })
}
