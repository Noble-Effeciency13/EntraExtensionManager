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

/**
 * Apply a skin's identity on top of a generated Fluent theme: base font, corner
 * radii, and a set of neutral surface overrides. `createLight/DarkTheme` only
 * derive *brand* colors from the ramp — the neutral canvas, panels, strokes and
 * hover states stay greyscale — so we tint those here to achieve a wholesale
 * palette change rather than a mere accent swap.
 */
function applySkin(
  base: Theme,
  fontFamilyBase: string,
  radii: Partial<Theme>,
  neutrals: Partial<Theme>,
): Theme {
  return { ...base, fontFamilyBase, ...radii, ...neutrals };
}

// Retro — silver-blue XP work area (light) / royal navy (dark).
const retroLightNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#ffffff',
  colorNeutralBackground1Hover: '#eaf2ff',
  colorNeutralBackground1Pressed: '#dbe8fb',
  colorNeutralBackground1Selected: '#e3edfd',
  colorNeutralBackground2: '#d8e4f5',
  colorNeutralBackground3: '#eaf1fb',
  colorNeutralBackgroundDisabled: '#e8eef7',
  colorSubtleBackgroundHover: '#e2ecfb',
  colorSubtleBackgroundPressed: '#d2e1f7',
  colorNeutralStroke1: '#9db6d8',
  colorNeutralStroke2: '#c3d4ec',
};
const retroDarkNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#16273f',
  colorNeutralBackground1Hover: '#1e3350',
  colorNeutralBackground1Pressed: '#101f33',
  colorNeutralBackground1Selected: '#22395a',
  colorNeutralBackground2: '#0e1a2e',
  colorNeutralBackground3: '#1a2d49',
  colorNeutralBackgroundDisabled: '#152439',
  colorSubtleBackgroundHover: '#1d3350',
  colorSubtleBackgroundPressed: '#162941',
  colorNeutralStroke1: '#365a86',
  colorNeutralStroke2: '#26415f',
};

// 8-bit — Game Boy LCD (light) / arcade CRT near-black (dark).
const gamingLightNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#e7f0cf',
  colorNeutralBackground1Hover: '#dde8bd',
  colorNeutralBackground1Pressed: '#cfdda8',
  colorNeutralBackground1Selected: '#d6e2b2',
  colorNeutralBackground2: '#cfe0b0',
  colorNeutralBackground3: '#dde8c2',
  colorNeutralBackgroundDisabled: '#d8e3bd',
  colorSubtleBackgroundHover: '#d8e6b8',
  colorSubtleBackgroundPressed: '#c8d9a0',
  colorNeutralStroke1: '#8a9a5e',
  colorNeutralStroke2: '#aab87f',
  colorNeutralForeground1: '#26310f',
};
const gamingDarkNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#0b1f12',
  colorNeutralBackground1Hover: '#112b18',
  colorNeutralBackground1Pressed: '#081a0e',
  colorNeutralBackground1Selected: '#14331c',
  colorNeutralBackground2: '#05140a',
  colorNeutralBackground3: '#0e2614',
  colorNeutralBackgroundDisabled: '#0a1d11',
  colorSubtleBackgroundHover: '#112b18',
  colorSubtleBackgroundPressed: '#0a2012',
  colorNeutralStroke1: '#1f7a3a',
  colorNeutralStroke2: '#16562b',
};

// Synthwave — pale lavender (light) / indigo night (dark).
const synthwaveLightNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#fdfbff',
  colorNeutralBackground1Hover: '#f4ecff',
  colorNeutralBackground1Pressed: '#e9dcfb',
  colorNeutralBackground1Selected: '#efe3ff',
  colorNeutralBackground2: '#f1e9fb',
  colorNeutralBackground3: '#efe6fb',
  colorNeutralBackgroundDisabled: '#ece3f7',
  colorSubtleBackgroundHover: '#f0e6ff',
  colorSubtleBackgroundPressed: '#e2d2f7',
  colorNeutralStroke1: '#d8c4f0',
  colorNeutralStroke2: '#e6d8f7',
};
const synthwaveDarkNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#241a3a',
  colorNeutralBackground1Hover: '#2e2247',
  colorNeutralBackground1Pressed: '#1d1530',
  colorNeutralBackground1Selected: '#33264f',
  colorNeutralBackground2: '#170f2b',
  colorNeutralBackground3: '#281b44',
  colorNeutralBackgroundDisabled: '#211836',
  colorSubtleBackgroundHover: '#2e2247',
  colorSubtleBackgroundPressed: '#221838',
  colorNeutralStroke1: '#4a3a6e',
  colorNeutralStroke2: '#3a2c58',
};

// Newsprint — aged paper + ink (light) / after-hours press (dark).
const newsprintLightNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#f7f1e2',
  colorNeutralBackground1Hover: '#efe6d2',
  colorNeutralBackground1Pressed: '#e6dcc4',
  colorNeutralBackground1Selected: '#ece2cc',
  colorNeutralBackground2: '#ece2cd',
  colorNeutralBackground3: '#e7ddc7',
  colorNeutralBackgroundDisabled: '#e9e1d0',
  colorSubtleBackgroundHover: '#ece2cd',
  colorSubtleBackgroundPressed: '#ded2b6',
  colorNeutralStroke1: '#b9a981',
  colorNeutralStroke2: '#cdbfa0',
  colorNeutralForeground1: '#1c1813',
  colorNeutralForeground2: '#3a3228',
  colorNeutralForeground3: '#5b5040',
};
const newsprintDarkNeutrals: Partial<Theme> = {
  colorNeutralBackground1: '#221e17',
  colorNeutralBackground1Hover: '#2a251c',
  colorNeutralBackground1Pressed: '#1b1813',
  colorNeutralBackground1Selected: '#2f2920',
  colorNeutralBackground2: '#1a1712',
  colorNeutralBackground3: '#272219',
  colorNeutralBackgroundDisabled: '#201c15',
  colorSubtleBackgroundHover: '#2a251c',
  colorSubtleBackgroundPressed: '#211d16',
  colorNeutralStroke1: '#5b4f3a',
  colorNeutralStroke2: '#3f372a',
  colorNeutralForeground1: '#efe6d4',
};

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
    light: applySkin(
      createLightTheme(retroBrand),
      retroFontFamily,
      retroRadii,
      retroLightNeutrals,
    ),
    dark: applySkin(
      createDarkTheme(retroBrand),
      retroFontFamily,
      retroRadii,
      retroDarkNeutrals,
    ),
  },
  gaming: {
    id: 'gaming',
    label: '8-bit',
    description: 'Neon arcade / pixel art.',
    light: applySkin(
      createLightTheme(gamingBrand),
      gamingFontFamily,
      gamingRadii,
      gamingLightNeutrals,
    ),
    dark: applySkin(
      createDarkTheme(gamingBrand),
      gamingFontFamily,
      gamingRadii,
      gamingDarkNeutrals,
    ),
  },
  synthwave: {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Neon 80s retro-future.',
    light: applySkin(
      createLightTheme(synthwaveBrand),
      synthwaveFontFamily,
      synthwaveRadii,
      synthwaveLightNeutrals,
    ),
    dark: applySkin(
      createDarkTheme(synthwaveBrand),
      synthwaveFontFamily,
      synthwaveRadii,
      synthwaveDarkNeutrals,
    ),
  },
  newsprint: {
    id: 'newsprint',
    label: 'Newsprint',
    description: 'Classic broadsheet print.',
    light: applySkin(
      createLightTheme(newsprintBrand),
      newsprintFontFamily,
      newsprintRadii,
      newsprintLightNeutrals,
    ),
    dark: applySkin(
      createDarkTheme(newsprintBrand),
      newsprintFontFamily,
      newsprintRadii,
      newsprintDarkNeutrals,
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
