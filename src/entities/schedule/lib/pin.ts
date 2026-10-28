const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')

/** SHA-256 hex of the PIN. */
export async function hashPin(pin: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin)))
}

/** No hash set means the PIN is not configured, so anything passes. */
export async function verifyPin(pin: string, hash: string | null): Promise<boolean> {
  return hash === null || (await hashPin(pin)) === hash
}

const LOCAL_SALT = 'local'

/** Salted with the household and participant so equal PINs hash differently. */
export function hashParticipantPin(pin: string, participantId: string, householdId: string | null): Promise<string> {
  return hashPin(`${householdId ?? LOCAL_SALT}:${participantId}:${pin}`)
}

/**
 * A PIN set before sync was enabled is salted with `local`, so that salt is accepted as well.
 * No hash means the participant has no PIN.
 */
export async function verifyParticipantPin(
  pin: string,
  participantId: string,
  householdId: string | null,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return true
  if ((await hashParticipantPin(pin, participantId, householdId)) === hash) return true
  return householdId !== null && (await hashParticipantPin(pin, participantId, null)) === hash
}

export const verifyAdminPin = (pin: string, hash: string | null): Promise<boolean> => verifyPin(pin, hash)
