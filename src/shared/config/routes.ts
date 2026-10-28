export const ROUTE_NAMES = {
  home: 'home',
  notFound: 'not-found',
} as const

export type RouteName = (typeof ROUTE_NAMES)[keyof typeof ROUTE_NAMES]
