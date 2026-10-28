import { useToast } from 'primevue/usetoast'

export const UNDO_TOAST_GROUP = 'undo'
const UNDO_LIFE_MS = 10_000

export function useUndoToast() {
  const toast = useToast()

  return {
    show(message: string) {
      toast.removeGroup(UNDO_TOAST_GROUP)
      toast.add({ group: UNDO_TOAST_GROUP, severity: 'info', summary: message, life: UNDO_LIFE_MS })
    },
  }
}
