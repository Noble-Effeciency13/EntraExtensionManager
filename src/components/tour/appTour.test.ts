import { describe, expect, it } from 'vitest';
import { appChromeTour, buildContextualTour } from './appTour';

describe('contextual walkthrough order', () => {
  const pageSteps = [
    { title: 'Directory extensions', body: 'Browse definitions.', target: 'directory-actions' },
    {
      title: 'Assign a value to a single object',
      body: 'Choose one object.',
      target: 'directory-assign-single',
    },
    {
      title: 'Bulk assign or update values',
      body: 'Choose multiple objects.',
      target: 'directory-assign-bulk',
    },
  ];

  it('introduces the tour and access mode before page-specific assignments', () => {
    const steps = buildContextualTour(appChromeTour, pageSteps);
    expect(steps.map((step) => step.title)).toEqual([
      'Quick tour',
      'Browse & manage extensions',
      'Read & Edit modes',
      'Directory extensions',
      'Assign a value to a single object',
      'Bulk assign or update values',
      'Switch tenants',
      'Make it yours',
      'Light or dark',
      'Your session',
    ]);
    expect(steps).toHaveLength(10);
    expect(steps.filter((step) => step.title === 'Quick tour')).toHaveLength(1);
  });

  it('preserves the base tour when no page steps are registered', () => {
    expect(buildContextualTour(appChromeTour, [])).toEqual(appChromeTour);
  });

  it('retains every supplied step exactly once and does not mutate its inputs', () => {
    const shared = appChromeTour.slice();
    const contextual = pageSteps.slice();
    const steps = buildContextualTour(shared, contextual);
    expect(new Set(steps).size).toBe(shared.length + contextual.length);
    expect(shared).toEqual(appChromeTour);
    expect(contextual).toEqual(pageSteps);
  });
});
