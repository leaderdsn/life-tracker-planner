import { DEPENDENCY_VERSIONS } from '@/shared/config'
import { delay, formatVersion } from '@/shared/lib'

import { TECHNOLOGIES } from '../config/technologies'

import type { Technology, TechnologyDto } from '../model/types'

/** Artificial latency so loading states are visible in the demo. */
export const MOCK_LATENCY_MS = 600

function withVersion(dto: TechnologyDto): Technology {
  const version = dto.packageName ? formatVersion(DEPENDENCY_VERSIONS[dto.packageName]) : 'методология'
  return { ...dto, version }
}

/**
 * Mock request. Replace the body with `httpClient.get<TechnologyDto[]>('technologies')`
 * from `@/shared/api` when a real backend is available.
 */
export async function fetchTechnologies(): Promise<Technology[]> {
  await delay(MOCK_LATENCY_MS)
  return TECHNOLOGIES.map(withVersion)
}
