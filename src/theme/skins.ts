import {
  createDarkTheme,
  createLightTheme,
  webDarkTheme,
  webLightTheme,
  type BrandVariants,
  type Theme,
} from '@fluentui/react-components';

/**
 * Portal "skins". Each skin keeps every feature identical but swaps the visual
 * identity by providing a light + dark Fluent {@link Theme}. The bulk of the
 * restyle is achieved through design tokens (brand ramp, base font, corner
 * radius); skin-specific flourishes (gradients, scanlines, glow) live in
 * `src/skins.css`, keyed off the `data-skin` attribute that {@link App} writes
 * onto `<body>`.
 */
export type SkinId =
  | 'default'
  | 'retro'
  | 'gaming'
  | 'synthwave'
  | 'newsprint';
export type ThemeMode = 'light' | 'dark';

export interface SkinDefinition {
  id: SkinId;
  /** Short name shown in the picker. */
  label: string;
  /** One-line flavor text shown beneath the label. */
  description: string;
  light: Theme;
  dark: Theme;
}

// --- Retro: Windows XP / 7 era — glossy azure chrome, Tahoma, tight corners.
const retroBrand: BrandVariants = {
  10: '#060a19',
  20: '#0a132e',
  30: '#0e1e4d',
  40: '#112a6e',
  50: '#123691',
  60: '#1043b5',
  70: '#1f54cc',
  80: '#2f66de',
  90: '#4d7de8',
  100: '#6e94ee',
  110: '#8facf3',
  120: '#afc4f7',
  130: '#ccdafb',
  140: '#e2ebfd',
  150: '#f0f5fe',
  160: '#f9fbff',
};

// --- 8-bit / Gaming: neon arcade green, monospace, hard pixel edges.
const gamingBrand: BrandVariants = {
  10: '#03190b',
  20: '#052a12',
  30: '#07421c',
  40: '#095a26',
  50: '#0b7330',
  60: '#0d8c3a',
  70: '#0e9e43',
  80: '#16c04f',
  90: '#2fd862',
  100: '#54e27c',
  110: '#79ec97',
  120: '#9df3b2',
  130: '#bef8cb',
  140: '#dafbe0',
  150: '#ecfeef',
  160: '#f7fff8',
};

// --- Synthwave: neon 80s — hot magenta over indigo, geometric sans.
const synthwaveBrand: BrandVariants = {
  10: '#1a0312',
  20: '#2c0620',
  30: '#470a34',
  40: '#5f0d46',
  50: '#791159',
  60: '#93156c',
  70: '#ad197f',
  80: '#c81b96',
  90: '#db44ab',
  100: '#e76dbf',
  110: '#ef93d0',
  120: '#f5b5e0',
  130: '#f9d2ec',
  140: '#fce4f4',
  150: '#fef1f9',
  160: '#fff8fc',
};

// --- Newsprint: classic broadsheet — sepia ink, serif, boxy rules.
const newsprintBrand: BrandVariants = {
  10: '#1c1108',
  20: '#2e1d0e',
  30: '#482e17',
  40: '#5e3d1f',
  50: '#6b4724',
  60: '#774f28',
  70: '#82562b',
  80: '#8e5e30',
  90: '#a06f3f',
  100: '#b1814e',
  110: '#c39a6a',
  120: '#d4b288',
  130: '#e3cba8',
  140: '#efddc6',
  150: '#f7ebdc',
  160: '#fdf7f0',
};

const retroFontFamily =
  "'Tahoma', 'Segoe UI', 'Geneva', 'Verdana', sans-serif";
const gamingFontFamily =
  "'Lucida Console', 'Consolas', 'Courier New', monospace";
const synthwaveFontFamily =
  "'Century Gothic', 'Futura', 'Trebuchet MS', 'Segoe UI', sans-serif";
const newsprintFontFamily = "'Georgia', 'Times New Roman', 'Times', serif";

/** Crisp, slightly-rounded corners reminiscent of the XP/Aero era. */
const retroRadii: Partial<Theme> = {
  borderRadiusNone: '0',
  borderRadiusSmall: '1px',
  borderRadiusMedium: '2px',
  borderRadiusLarge: '3px',
  borderRadiusXLarge: '4px',
};

/** Hard pixel edges — no rounding anywhere. */
const gamingRadii: Partial<Theme> = {
  borderRadiusNone: '0',
  borderRadiusSmall: '0',
  borderRadiusMedium: '0',
  borderRadiusLarge: '0',
  borderRadiusXLarge: '0',
};

/** Sleek, slightly-pill rounding for a modern retro-future feel. */
const synthwaveRadii: Partial<Theme> = {
  borderRadiusNone: '0',
  borderRadiusSmall: '4px',
  borderRadiusMedium: '6px',
  borderRadiusLarge: '10px',
  borderRadiusXLarge: '14px',
};

/** Boxy print columns — crisp, near-square corners. */
const newsprintRadii: Partial<Theme> = {
  borderRadiusNone: '0',
  borderRadiusSmall: '0',
  borderRadiusMedium: '1px',
  borderRadiusLarge: '2px',
  borderRadiusXLarge: '2px',
};

/** Apply a skin's font + corner identity on top of a generated Fluent theme. */
function withIdentity(
  base: Theme,
  fontFamilyBase: string,
  radii: Partial<Theme>,
): Theme {
  return { ...base, fontFamilyBase, ...radii };
}

export const skins: Record<SkinId, SkinDefinition> = {
  default: {
    id: 'default',
    label: 'Fluent',
    description: 'The standard Microsoft look.',
    light: webLightTheme,
    dark: webDarkTheme,
  },
  retro: {
    id: 'retro',
    label: 'Retro',
    description: 'Windows XP / 7 throwback.',
    light: withIdentity(createLightTheme(retroBrand), retroFontFamily, retroRadii),
    dark: withIdentity(createDarkTheme(retroBrand), retroFontFamily, retroRadii),
  },
  gaming: {
    id: 'gaming',
    label: '8-bit',
    description: 'Neon arcade / pixel art.',
    light: withIdentity(createLightTheme(gamingBrand), gamingFontFamily, gamingRadii),
    dark: withIdentity(createDarkTheme(gamingBrand), gamingFontFamily, gamingRadii),
  },
  synthwave: {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Neon 80s retro-future.',
    light: withIdentity(
      createLightTheme(synthwaveBrand),
      synthwaveFontFamily,
      synthwaveRadii,
    ),
    dark: withIdentity(
      createDarkTheme(synthwaveBrand),
      synthwaveFontFamily,
      synthwaveRadii,
    ),
  },
  newsprint: {
    id: 'newsprint',
    label: 'Newsprint',
    description: 'Classic broadsheet print.',
    light: withIdentity(
      createLightTheme(newsprintBrand),
      newsprintFontFamily,
      newsprintRadii,
    ),
    dark: withIdentity(
      createDarkTheme(newsprintBrand),
      newsprintFontFamily,
      newsprintRadii,
    ),
  },
};

export const skinList: SkinDefinition[] = Object.values(skins);

export const DEFAULT_SKIN: SkinId = 'default';

/** Narrow an arbitrary stored string to a known {@link SkinId}. */
export function isSkinId(value: string | null | undefined): value is SkinId {
  return (
    value === 'default' ||
    value === 'retro' ||
    value === 'gaming' ||
    value === 'synthwave' ||
    value === 'newsprint'
  );
}

/** Resolve the Fluent theme for a skin + light/dark mode, with a safe fallback. */
export function resolveTheme(skin: SkinId, mode: ThemeMode): Theme {
  const definition = skins[skin] ?? skins[DEFAULT_SKIN];
  return mode === 'dark' ? definition.dark : definition.light;
}
