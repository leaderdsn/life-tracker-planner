import { onScopeDispose, ref } from 'vue'

import type { Ref } from 'vue'

const MOBILE_QUERY = '(max-width: 47.99rem)'

export function useIsMobile(): Ref<boolean> {
  const query = typeof window.matchMedia === 'function' ? window.matchMedia(MOBILE_QUERY) : null
  const isMobile = ref(query?.matches ?? false)

  if (query) {
    const onChange = (event: MediaQueryListEvent) => {
      isMobile.value = event.matches
    }
    query.addEventListener('change', onChange)
    onScopeDispose(() => query.removeEventListener('change', onChange))
  }

  return isMobile
}
