export type FirebaseConfig = {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  appId: string
}

const e = import.meta.env

/** Null when Firebase is not configured; sync then falls back to the same-browser transport. */
const firebase: FirebaseConfig | null =
  e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_DATABASE_URL
    ? {
        apiKey: e.VITE_FIREBASE_API_KEY,
        authDomain: e.VITE_FIREBASE_AUTH_DOMAIN ?? '',
        databaseURL: e.VITE_FIREBASE_DATABASE_URL,
        projectId: e.VITE_FIREBASE_PROJECT_ID ?? '',
        appId: e.VITE_FIREBASE_APP_ID ?? '',
      }
    : null

export const env = {
  appTitle: e.VITE_APP_TITLE ?? 'Расписание',
  apiUrl: e.VITE_API_URL ?? '/api',
  isDev: e.DEV,
  /** Published address used for invite links when running locally */
  publicUrl: e.VITE_PUBLIC_URL ?? '',
  firebase,
} as const
