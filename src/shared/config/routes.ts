export const ROUTE_NAMES = {
  all: 'all',
  participant: 'participant',
  guest: 'guest',
  notFound: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
