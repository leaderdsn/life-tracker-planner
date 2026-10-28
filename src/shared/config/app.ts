export const APP_VERSION = __APP_VERSION__

/** Versions of all installed packages from package.json (ranges, e.g. "^3.5.0"). */
export const DEPENDENCY_VERSIONS: Readonly<Record<string, string>> = __DEPENDENCIES__

// Replace with your repository links after creating a project from the template.
export const APP_LINKS = {
  repository: 'https://github.com/leaderdsn/vue-fsd-starter',
  readme: 'https://github.com/leaderdsn/vue-fsd-starter#readme',
} as const
