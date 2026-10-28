import { HOUSEHOLD_ID_LENGTH } from '../config'

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function generateHouseholdId(length = HOUSEHOLD_ID_LENGTH): string {
  // Skip bytes past the largest multiple of 62 to avoid modulo bias.
  const limit = 256 - (256 % ALPHABET.length)
  let id = ''
  while (id.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length))) {
      if (b < limit && id.length < length) id += ALPHABET[b % ALPHABET.length]
    }
  }
  return id
}
