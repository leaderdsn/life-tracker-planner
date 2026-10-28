// Logo files are named after technology ids: `logos/<id>.svg`.
// Sources: official project repositories, Simple Icons (CC0) for single-color marks,
// Twemoji (CC-BY 4.0) for Husky. See README, section "Логотипы технологий".
const logoModules = import.meta.glob<string>('./logos/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
})

const LOGOS_BY_ID: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(logoModules).map(([path, url]) => [path.replace(/^.*\/(.+)\.svg$/, '$1'), url]),
)

/** Returns the logo URL for a technology, or `null` when there is no logo file. */
export function getTechnologyLogo(id: string): string | null {
  return LOGOS_BY_ID[id] ?? null
}
