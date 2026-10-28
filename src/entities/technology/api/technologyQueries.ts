import { useQuery } from '@tanstack/vue-query'

import { fetchTechnologies } from './technologyApi'

export const technologyKeys = {
  all: ['technology'] as const,
  list: () => [...technologyKeys.all, 'list'] as const,
}

export function useTechnologiesQuery() {
  return useQuery({
    queryKey: technologyKeys.list(),
    queryFn: fetchTechnologies,
  })
}
