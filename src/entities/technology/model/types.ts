export type TechnologyCategory = 'core' | 'styles' | 'state' | 'ui' | 'quality'

export type Technology = {
  id: string
  name: string
  /** npm package used to resolve the installed version; `null` for methodologies. */
  packageName: string | null
  /** Resolved display version, e.g. "3.5.44" or "методология". */
  version: string
  category: TechnologyCategory
  /** Short monogram shown in the card badge when there is no logo file (`ui/logos/<id>.svg`). */
  monogram: string
  /** Brand color used as a badge accent (data, not a style token). */
  accent: string
  description: string
  /** Why the technology is used in this template. */
  purpose: string
  docsUrl: string
}

export type TechnologyDto = Omit<Technology, 'version'>
