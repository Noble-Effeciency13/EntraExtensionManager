import { describe, expect, it } from 'vitest';
import {
  filterSelect,
  graphFilter,
  matchesFilter,
  matchesFilters,
  validateFilters,
  FILTER_PROPERTIES,
  type AssignmentFilter,
} from './assignmentFilters';

const condition = (
  property: string,
  operator: AssignmentFilter['operator'],
  value = '',
): AssignmentFilter => ({ property, operator, value });

describe('assignment filters', () => {
  it('combines conditions with AND and excludes inapplicable types even for negative/empty operators', () => {
    const filters = [
      condition('department', 'eq', 'Engineering'),
      condition('accountEnabled', 'eq', 'true'),
    ];
    expect(
      matchesFilters({ department: 'engineering', accountEnabled: true }, 'User', filters),
    ).toBe(true);
    expect(
      matchesFilters({ department: 'Engineering', accountEnabled: false }, 'User', filters),
    ).toBe(false);
    expect(matchesFilters({}, 'Group', [condition('department', 'empty')])).toBe(false);
    expect(matchesFilters({}, 'Group', [condition('department', 'ne', 'Engineering')])).toBe(false);
  });

  it('supports every text operator and treats null/empty arrays as empty but false as nonempty', () => {
    for (const [operator, value] of [
      ['eq', 'Engineer'],
      ['ne', 'Manager'],
      ['contains', 'gine'],
      ['startsWith', 'Eng'],
      ['endsWith', 'eer'],
      ['notEmpty', ''],
    ] as const) {
      expect(matchesFilter('Engineer', condition('jobTitle', operator, value))).toBe(true);
    }
    expect(matchesFilter(null, condition('mail', 'empty'))).toBe(true);
    expect(matchesFilter([], condition('groupTypes', 'empty'))).toBe(true);
    expect(matchesFilter(false, condition('accountEnabled', 'notEmpty'))).toBe(true);
    expect(
      matchesFilter(['Unified', 'DynamicMembership'], condition('groupTypes', 'eq', 'Unified')),
    ).toBe(true);
  });

  it('supports all 15 extension attributes on users and devices with the correct Graph property', () => {
    expect(
      FILTER_PROPERTIES.filter((entry) => entry.key.startsWith('extensionAttribute')),
    ).toHaveLength(15);
    for (let index = 1; index <= 15; index++) {
      const filter = condition(`extensionAttribute${index}`, 'eq', 'West');
      expect(
        matchesFilters({ onPremisesExtensionAttributes: { [filter.property]: 'West' } }, 'User', [
          filter,
        ]),
      ).toBe(true);
      expect(
        matchesFilters({ extensionAttributes: { [filter.property]: 'West' } }, 'Device', [filter]),
      ).toBe(true);
      expect(filterSelect('User', [filter])).toBe('id,displayName,onPremisesExtensionAttributes');
      expect(filterSelect('Device', [filter])).toBe('id,displayName,extensionAttributes');
    }
  });

  it('escapes OData and only pushes supported narrowing operators to Graph', () => {
    expect(
      graphFilter('User', [
        condition('displayName', 'startsWith', "O'Brien"),
        condition('department', 'eq', 'Engineering'),
        condition('mail', 'endsWith', '@contoso.com'),
      ]),
    ).toBe("startswith(displayName,'O''Brien') and department eq 'Engineering'");
    expect(graphFilter('Application', [condition('displayName', 'eq', 'App')])).toBeUndefined();
  });

  it('rejects unknown properties, invalid booleans and invalid membership IDs', () => {
    for (const filter of [
      condition('unknown', 'eq', 'x'),
      condition('accountEnabled', 'eq', 'yes'),
      condition('groupMembership', 'eq', 'Team'),
      condition('groupMembership', 'contains', 'x'),
    ]) {
      expect(() => validateFilters([filter])).toThrow();
    }
    expect(() =>
      validateFilters([
        condition('administrativeUnitMembership', 'eq', '11111111-1111-1111-1111-111111111111'),
      ]),
    ).not.toThrow();
  });
});
