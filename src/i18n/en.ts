/**
 * Default (English) translation dictionary. This is intentionally small — it
 * establishes the typed key/value seam so strings can be externalized
 * incrementally and additional locales added later. Keys are namespaced by
 * feature (`feature.thing`).
 */
export const en = {
  'common.skip': 'Skip',
  'common.next': 'Next',
  'common.back': 'Back',
  'common.finish': 'Finish',
  'commandPalette.placeholder': 'Type a command or search…',
  'commandPalette.empty': 'No matching commands',
} as const;

export type TranslationKey = keyof typeof en;
