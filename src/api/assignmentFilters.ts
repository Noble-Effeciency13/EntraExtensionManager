import { escapeODataString } from '@/graph/odata';

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'empty'
  | 'notEmpty';
export interface AssignmentFilter {
  property: string;
  operator: FilterOperator;
  value: string;
}
export interface FilterProperty {
  key: string;
  label: string;
  types: string[];
  kind: 'text' | 'boolean' | 'membership';
  select?: string;
}

const directoryTypes = [
  'User',
  'Group',
  'Device',
  'Application',
  'AdministrativeUnit',
  'Organization',
];
const membershipTypes = ['User', 'Group', 'Device'];
export const FILTER_PROPERTIES: FilterProperty[] = [
  { key: 'displayName', label: 'Display Name', types: directoryTypes, kind: 'text' },
  { key: 'userPrincipalName', label: 'User Principal Name (UPN)', types: ['User'], kind: 'text' },
  { key: 'mail', label: 'Mail', types: ['User', 'Group'], kind: 'text' },
  { key: 'department', label: 'Department', types: ['User'], kind: 'text' },
  { key: 'jobTitle', label: 'Job Title', types: ['User'], kind: 'text' },
  { key: 'companyName', label: 'Company Name', types: ['User'], kind: 'text' },
  { key: 'accountEnabled', label: 'Account Enabled', types: ['User', 'Device'], kind: 'boolean' },
  { key: 'userType', label: 'User Type', types: ['User'], kind: 'text' },
  { key: 'groupTypes', label: 'Group Type', types: ['Group'], kind: 'text' },
  { key: 'membershipRule', label: 'Group Membership Rule', types: ['Group'], kind: 'text' },
  { key: 'securityEnabled', label: 'Security Enabled', types: ['Group'], kind: 'boolean' },
  { key: 'mailEnabled', label: 'Mail Enabled', types: ['Group'], kind: 'boolean' },
  {
    key: 'groupMembership',
    label: 'Group Membership (Group ID)',
    types: membershipTypes,
    kind: 'membership',
  },
  {
    key: 'administrativeUnitMembership',
    label: 'Administrative Unit Membership (Unit ID)',
    types: membershipTypes,
    kind: 'membership',
  },
  { key: 'targetType', label: 'Object Type', types: directoryTypes, kind: 'text' },
  { key: 'id', label: 'Object ID', types: directoryTypes, kind: 'text' },
  ...Array.from(
    { length: 15 },
    (_, index): FilterProperty => ({
      key: `extensionAttribute${index + 1}`,
      label: `ExtensionAttribute${index + 1}`,
      types: ['User', 'Device'],
      kind: 'text',
    }),
  ),
];

export const FILTER_OPERATORS: { key: FilterOperator; label: string }[] = [
  { key: 'eq', label: 'Equals' },
  { key: 'ne', label: 'Not Equals' },
  { key: 'contains', label: 'Contains' },
  { key: 'startsWith', label: 'Starts With' },
  { key: 'endsWith', label: 'Ends With' },
  { key: 'empty', label: 'Is Empty' },
  { key: 'notEmpty', label: 'Is Not Empty' },
];

export function propertyDefinition(key: string): FilterProperty {
  const property = FILTER_PROPERTIES.find((entry) => entry.key === key);
  if (!property) throw new Error(`Unknown filter property: ${key}`);
  return property;
}

export function operatorsFor(property: FilterProperty): typeof FILTER_OPERATORS {
  if (property.kind === 'membership')
    return FILTER_OPERATORS.filter((entry) => ['eq', 'ne'].includes(entry.key));
  if (property.kind === 'boolean')
    return FILTER_OPERATORS.filter((entry) =>
      ['eq', 'ne', 'empty', 'notEmpty'].includes(entry.key),
    );
  return FILTER_OPERATORS;
}

export function validateFilters(filters: AssignmentFilter[]): void {
  for (const filter of filters) {
    const property = propertyDefinition(filter.property);
    if (!operatorsFor(property).some((entry) => entry.key === filter.operator))
      throw new Error(`Unsupported operator for ${property.label}.`);
    if (['empty', 'notEmpty'].includes(filter.operator)) continue;
    if (!filter.value.trim()) throw new Error(`Enter a value for ${property.label}.`);
    if (property.kind === 'boolean' && !['true', 'false'].includes(filter.value))
      throw new Error(`${property.label} must be true or false.`);
    if (
      property.kind === 'membership' &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(filter.value.trim())
    ) {
      throw new Error(`${property.label} requires a GUID.`);
    }
  }
}

export function filterSelect(targetType: string, filters: AssignmentFilter[]): string {
  const fields = new Set(['id', 'displayName']);
  for (const filter of filters) {
    const property = propertyDefinition(filter.property);
    if (
      !property.types.includes(targetType) ||
      property.kind === 'membership' ||
      filter.property === 'targetType'
    )
      continue;
    fields.add(
      filter.property.startsWith('extensionAttribute')
        ? targetType === 'User'
          ? 'onPremisesExtensionAttributes'
          : 'extensionAttributes'
        : filter.property,
    );
  }
  return [...fields].join(',');
}

export function filterValue(
  raw: Record<string, unknown>,
  targetType: string,
  property: string,
): unknown {
  if (property === 'targetType') return targetType;
  if (property.startsWith('extensionAttribute')) {
    const attributes =
      raw[targetType === 'User' ? 'onPremisesExtensionAttributes' : 'extensionAttributes'];
    return attributes && typeof attributes === 'object'
      ? (attributes as Record<string, unknown>)[property]
      : undefined;
  }
  return raw[property];
}

export function matchesFilter(value: unknown, filter: AssignmentFilter): boolean {
  const values = (Array.isArray(value) ? value : [value])
    .filter((entry) => entry != null && entry !== '')
    .map((entry) => String(entry).toLowerCase());
  const expected = filter.value.trim().toLowerCase();
  switch (filter.operator) {
    case 'empty':
      return values.length === 0;
    case 'notEmpty':
      return values.length > 0;
    case 'eq':
      return values.some((entry) => entry === expected);
    case 'ne':
      return !values.some((entry) => entry === expected);
    case 'contains':
      return values.some((entry) => entry.includes(expected));
    case 'startsWith':
      return values.some((entry) => entry.startsWith(expected));
    case 'endsWith':
      return values.some((entry) => entry.endsWith(expected));
  }
}

export function matchesFilters(
  raw: Record<string, unknown>,
  targetType: string,
  filters: AssignmentFilter[],
): boolean {
  return filters.every(
    (filter) =>
      propertyDefinition(filter.property).types.includes(targetType) &&
      matchesFilter(filterValue(raw, targetType, filter.property), filter),
  );
}

export function graphFilter(targetType: string, filters: AssignmentFilter[]): string | undefined {
  if (!['User', 'Group', 'Device'].includes(targetType)) return undefined;
  const clauses: string[] = [];
  for (const filter of filters) {
    const property = propertyDefinition(filter.property);
    if (!property.types.includes(targetType)) continue;
    const value = escapeODataString(filter.value.trim());
    if (['displayName', 'userPrincipalName', 'mail'].includes(filter.property)) {
      if (filter.operator === 'eq') clauses.push(`${filter.property} eq '${value}'`);
      if (filter.operator === 'startsWith')
        clauses.push(`startswith(${filter.property},'${value}')`);
    }
    if (
      ['department', 'jobTitle', 'companyName', 'userType'].includes(filter.property) &&
      filter.operator === 'eq'
    ) {
      clauses.push(`${filter.property} eq '${value}'`);
    }
    if (property.kind === 'boolean' && filter.operator === 'eq')
      clauses.push(`${filter.property} eq ${filter.value}`);
  }
  return clauses.length ? clauses.join(' and ') : undefined;
}

export function assignmentFilterSummary(filters: AssignmentFilter[]): string {
  return filters
    .map(
      (filter) =>
        `${propertyDefinition(filter.property).label} ${FILTER_OPERATORS.find((entry) => entry.key === filter.operator)?.label} ${['empty', 'notEmpty'].includes(filter.operator) ? '' : filter.value}`,
    )
    .join(' AND ');
}
