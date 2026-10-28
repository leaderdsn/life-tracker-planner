const MIN_DISTANCE = 90
const MAX_DURATION_MS = 700
const CLICK_SUPPRESS_MS = 350

type Handlers = { left: () => void; right: () => void }

/** Pointer-based horizontal swipe; works with touch, pen and mouse. */
export function useSwipe({ left, right }: Handlers) {
  let start: { x: number; y: number; at: number } | null = null
  let swipedAt = 0

  function onPointerdown(event: PointerEvent) {
    start = { x: event.clientX, y: event.clientY, at: Date.now() }
  }

  function onPointerup(event: PointerEvent) {
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    const fast = Date.now() - start.at <= MAX_DURATION_MS
    start = null
    if (!fast || Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return
    swipedAt = Date.now()
    if (dx < 0) left()
    else right()
  }

  function onPointercancel() {
    start = null
  }

  /** A swipe that ends on a button must not count as a tap on it. */
  function onClickCapture(event: MouseEvent) {
    if (Date.now() - swipedAt < CLICK_SUPPRESS_MS) {
      event.stopPropagation()
      event.preventDefault()
    }
  }

  return { onPointerdown, onPointerup, onPointercancel, onClickCapture }
}
