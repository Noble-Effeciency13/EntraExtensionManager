import { en, type TranslationKey } from './en';

/**
 * Minimal i18n helper. Today only English ships; `dictionary` is the single
 * place a locale would be selected/registered. `t()` looks up a typed key and
 * supports simple `{name}` interpolation.
 *
 * This is a scaffold: components can adopt `t('feature.key')` incrementally
 * without a framework dependency. Swap `dictionary` for a locale-aware lookup
 * (and add a context/provider) when real localization is needed.
 */
const dictionary: Record<TranslationKey, string> = en;

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let value: string = dictionary[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replace(`{${name}}`, String(replacement));
    }
  }
  return value;
}

export type { TranslationKey };
