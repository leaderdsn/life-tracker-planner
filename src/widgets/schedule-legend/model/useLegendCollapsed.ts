import { ref, watch } from 'vue'

const STORAGE_KEY = 'life-tracker:legend-collapsed'

function read(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const collapsed = ref(read())

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    // Storage may be unavailable; the choice then lasts until reload.
  }
})

export function useLegendCollapsed() {
  return { collapsed, toggle: () => (collapsed.value = !collapsed.value) }
}
