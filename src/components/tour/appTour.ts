import type { TourStep } from './TourProvider';

/**
 * The default "chrome" walkthrough — explains the shell controls that are
 * present on every page. Used as the base tour everywhere (live and demo) and
 * appended after any page-specific steps. Phrasing is neutral so it reads
 * correctly in both a real tenant and the demo.
 */
export const appChromeTour: TourStep[] = [
  {
    title: 'Quick tour',
    body: "Here's a 30-second tour of the portal. You can leave anytime with Skip (or Esc), and replay it from the Help (?) button in the top bar.",
    target: null,
  },
  {
    title: 'Browse & manage extensions',
    body: 'Use the navigation to work with Schema, Directory and Open extensions. The Tools section adds an audit log, usage monitor, value validator and manifest snippet generator.',
    target: 'nav',
  },
  {
    title: 'Read & Edit modes',
    body: "You start read-only. Switch to Edit to create, assign, update and delete. In a real tenant Entra asks for extra consent the first time; in the demo it's instant.",
    target: 'mode',
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
