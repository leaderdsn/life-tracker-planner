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
