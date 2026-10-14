import type { TourStep } from './TourProvider';

/**
 * The default "chrome" walkthrough — explains the shell controls that are
 * present on every page. Used as the base tour everywhere (live and demo) and
 * organized around page-specific steps. Phrasing is neutral so it reads
 * correctly in both a real tenant and the demo.
 */
export const appChromeTour: TourStep[] = [
  {
    title: 'Quick tour',
    body: 'Start with navigation and access mode, explore the current page, then finish with tenant and personal settings. Leave anytime with Skip or Esc, and replay from Help (?) in the top bar. The walkthrough explains actions without performing writes.',
    target: null,
    beforePage: true,
  },
  {
    title: 'Browse & manage extensions',
    body: 'Use the navigation to work with Schema, Directory and Open extensions. The Tools section adds an audit log, usage monitor, value validator and manifest snippet generator.',
    target: 'nav',
    beforePage: true,
  },
  {
    title: 'Read & Edit modes',
    body: "You start read-only. Switch to Edit to create, assign, update and delete. In a real tenant Entra asks for extra consent the first time; in the demo it's instant.",
    target: 'mode',
    beforePage: true,
  },
  {
    title: 'Switch tenants',
    body: 'Hop between the tenants your account can reach (the demo provides simulated tenants).',
    target: 'tenant',
  },
  {
    title: 'Make it yours',
    body: 'Restyle the whole portal with a skin — Fluent, Retro, 8-bit, Synthwave or Newsprint.',
    target: 'skin',
  },
  {
    title: 'Light or dark',
    body: 'Flip between light and dark themes at any time. Your preference is remembered.',
    target: 'theme',
  },
  {
    title: 'Your session',
    body: 'Open the account menu to switch account or sign out. In the demo you can exit or sign in to a real tenant from here.',
    target: 'account',
  },
];

export function buildContextualTour(chromeSteps: TourStep[], pageSteps: TourStep[]): TourStep[] {
  return [
    ...chromeSteps.filter((step) => step.beforePage),
    ...pageSteps,
    ...chromeSteps.filter((step) => !step.beforePage),
  ];
}
