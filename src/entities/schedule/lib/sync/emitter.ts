import type { Unsubscribe } from '../../model/types'

/** Tiny subscription list that replays the latest value to new subscribers. */
export function createEmitter<T>() {
  const listeners = new Set<(value: T) => void>()
  let last: { value: T } | undefined
  return {
    on(cb: (value: T) => void): Unsubscribe {
      listeners.add(cb)
      if (last) cb(last.value)
      return () => void listeners.delete(cb)
    },
    emit(value: T) {
      last = { value }
      listeners.forEach((cb) => cb(value))
    },
  }
}
