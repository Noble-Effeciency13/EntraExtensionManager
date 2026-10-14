import type { Client } from '@microsoft/microsoft-graph-client';
import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMode } from '@/auth/mode';
import { useGraphToken } from '@/auth/useGraphToken';
import { createGraphClient } from '@/graph/client';
import {
  filterSelect,
  graphFilter,
  matchesFilters,
  propertyDefinition,
  validateFilters,
  type AssignmentFilter,
} from './assignmentFilters';
import type { DirectoryExtensionProperty, SchemaExtension } from '@/types/extensions';

export const BULK_COLLECTIONS: Record<string, string> = {
  User: '/users',
  Group: '/groups',
  Device: '/devices',
  Application: '/applications',
  AdministrativeUnit: '/directory/administrativeUnits',
  Organization: '/organization',
};

export type BulkExtension =
  | { variant: 'schema'; ext: SchemaExtension }
  | { variant: 'directory'; ext: DirectoryExtensionProperty };

export interface BulkObject {
  targetType: string;
  id: string;
  displayName: string;
}

export interface BulkResult extends BulkObject {
  success: boolean;
  error?: string;
}

export function bulkObjectKey(object: BulkObject): string {
  return `${object.targetType}/${object.id}`;
}

export function bulkTargetTypes(extension: BulkExtension): string[] {
  return extension.variant === 'schema' ? extension.ext.targetTypes : extension.ext.targetObjects;
}

function validatePrimitive(type: string, value: unknown, name: string) {
  let valid = false;
  switch (type) {
    case 'Boolean':
      valid = typeof value === 'boolean';
      break;
    case 'Integer':
      valid =
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= -2147483648 &&
        value <= 2147483647;
      break;
    case 'LargeInteger':
      valid = typeof value === 'number' && Number.isSafeInteger(value);
      break;
    case 'DateTime':
      valid =
        typeof value === 'string' &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
        Number.isFinite(Date.parse(value));
      break;
    case 'Binary':
      valid =
        typeof value === 'string' &&
        /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
      break;
    case 'String':
      valid = typeof value === 'string';
      break;
  }
  if (!valid) throw new Error(`${name} must be a valid ${type} value.`);
}

export function parseBulkValue(extension: BulkExtension, text: string): unknown {
  if (extension.variant === 'directory') {
    const type = extension.ext.dataType;
    const value = ['Boolean', 'Integer', 'LargeInteger'].includes(type)
      ? (JSON.parse(text) as unknown)
      : text;
    validatePrimitive(type, value, extension.ext.name);
    return value;
  }
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Schema values must be a JSON object.');
  }
  const entries = Object.entries(value);
  if (!entries.length) throw new Error('Provide at least one schema property.');
  for (const [name, propertyValue] of entries) {
    const property = extension.ext.properties.find((entry) => entry.name === name);
    if (!property) throw new Error(`Unknown schema property: ${name}`);
    validatePrimitive(property.type, propertyValue, name);
  }
  return value;
}

export async function listBulkObjects(
  client: Client,
  targetTypes: string[],
  filters: AssignmentFilter[] = [],
  signal?: AbortSignal,
): Promise<BulkObject[]> {
  validateFilters(filters);
  const objects: BulkObject[] = [];
  const memberships = new Map<string, Set<string>>();
  for (const filter of filters) {
    if (propertyDefinition(filter.property).kind !== 'membership') continue;
    signal?.throwIfAborted();
    const membershipKey = `${filter.property}/${filter.value.trim().toLowerCase()}`;
    if (memberships.has(membershipKey)) continue;
    const path =
      filter.property === 'groupMembership' ? '/groups' : '/directory/administrativeUnits';
    const members = new Set<string>();
    let memberRequest = client
      .api(`${path}/${encodeURIComponent(filter.value.trim())}/members`)
      .select('id')
      .top(999);
    let memberNext: string | undefined;
    do {
      signal?.throwIfAborted();
      const page = (await memberRequest.get()) as {
        value: { id: string }[];
        '@odata.nextLink'?: string;
      };
      signal?.throwIfAborted();
      if (!Array.isArray(page.value)) throw new Error('Incomplete membership listing.');
      for (const member of page.value) {
        if (!member.id) throw new Error('A membership result has no object ID.');
        members.add(member.id.toLowerCase());
      }
      memberNext = page['@odata.nextLink'];
      if (memberNext) memberRequest = client.api(memberNext);
    } while (memberNext);
    memberships.set(membershipKey, members);
  }
  for (const targetType of [...new Set(targetTypes)]) {
    signal?.throwIfAborted();
    const collection = BULK_COLLECTIONS[targetType];
    if (!collection) throw new Error(`Unsupported target type: ${targetType}`);
    if (filters.some((filter) => !propertyDefinition(filter.property).types.includes(targetType)))
      continue;
    if (
      !matchesFilters(
        {},
        targetType,
        filters.filter((filter) => filter.property === 'targetType'),
      )
    )
      continue;
    const serverFilter = graphFilter(targetType, filters);
    let request = client.api(collection).select(filterSelect(targetType, filters)).top(100);
    if (serverFilter)
      request = request.header('ConsistencyLevel', 'eventual').count(true).filter(serverFilter);
    let nextLink: string | undefined;
    do {
      signal?.throwIfAborted();
      const page = (await request.get()) as {
        value: Record<string, unknown>[];
        '@odata.nextLink'?: string;
      };
      signal?.throwIfAborted();
      if (!Array.isArray(page.value)) throw new Error(`Invalid object listing for ${targetType}.`);
      for (const row of page.value) {
        if (typeof row.id !== 'string' || !row.id)
          throw new Error(`An object in ${targetType} has no id.`);
        const membershipMatches = filters
          .filter((filter) => propertyDefinition(filter.property).kind === 'membership')
          .every((filter) => {
            const members = memberships.get(
              `${filter.property}/${filter.value.trim().toLowerCase()}`,
            )!;
            return filter.operator === 'eq'
              ? members.has((row.id as string).toLowerCase())
              : !members.has((row.id as string).toLowerCase());
          });
        if (
          !membershipMatches ||
          !matchesFilters(
            row,
            targetType,
            filters.filter((filter) => propertyDefinition(filter.property).kind !== 'membership'),
          )
        )
          continue;
        objects.push({
          targetType,
          id: row.id,
          displayName:
            typeof row.displayName === 'string' && row.displayName ? row.displayName : row.id,
        });
      }
      nextLink = page['@odata.nextLink'];
      if (nextLink) {
        request = client.api(nextLink);
        if (serverFilter) request = request.header('ConsistencyLevel', 'eventual');
      }
    } while (nextLink);
  }
  return [...new Map(objects.map((object) => [bulkObjectKey(object), object])).values()];
}

export async function updateBulkObjects(
  client: Client,
  extension: BulkExtension,
  objects: BulkObject[],
  valueText: string,
  onProgress?: (completed: number, total: number) => void,
  canWrite?: () => boolean,
): Promise<BulkResult[]> {
  const value = parseBulkValue(extension, valueText);
  const attribute = extension.variant === 'schema' ? extension.ext.id : extension.ext.name;
  const targets = bulkTargetTypes(extension);
  const unique = [...new Map(objects.map((object) => [bulkObjectKey(object), object])).values()];
  if (!unique.length) throw new Error('Select at least one object.');
  for (const object of unique) {
    if (
      !targets.includes(object.targetType) ||
      !BULK_COLLECTIONS[object.targetType] ||
      !object.id
    ) {
      throw new Error(`Invalid target: ${bulkObjectKey(object)}`);
    }
  }
  const results: BulkResult[] = [];
  for (const object of unique) {
    try {
      if (canWrite && !canWrite())
        throw new Error('Bulk Update requires Edit mode. No write was attempted.');
      await client
        .api(`${BULK_COLLECTIONS[object.targetType]}/${encodeURIComponent(object.id)}`)
        .patch({ [attribute]: value });
      results.push({ ...object, success: true });
    } catch (error) {
      results.push({
        ...object,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    onProgress?.(results.length, unique.length);
  }
  return results;
}

export function useBulkObjects(
  targetTypes: string[],
  enabled: boolean,
  filters: AssignmentFilter[] = [],
) {
  const getToken = useGraphToken();
  const { isEdit } = useMode();
  return useQuery({
    queryKey: ['bulkObjects', targetTypes, filters] as const,
    enabled: enabled && isEdit && targetTypes.length > 0,
    queryFn: async ({ signal }) =>
      listBulkObjects(createGraphClient(await getToken()), targetTypes, filters, signal),
    retry: false,
    gcTime: 0,
    staleTime: 0,
  });
}

export function useBulkUpdate(extension: BulkExtension) {
  const getToken = useGraphToken();
  const { isEdit } = useMode();
  const writeAllowed = useRef(isEdit);
  writeAllowed.current = isEdit;
  const queryClient = useQueryClient();
  return useMutation({
    retry: false,
    mutationFn: async (input: {
      objects: BulkObject[];
      valueText: string;
      onProgress: (completed: number, total: number) => void;
    }) => {
      if (!writeAllowed.current) throw new Error('Bulk Update requires Edit mode.');
      return updateBulkObjects(
        createGraphClient(await getToken()),
        extension,
        input.objects,
        input.valueText,
        input.onProgress,
        () => writeAllowed.current,
      );
    },
    onSuccess: () => {
      for (const queryKey of ['usage', 'usageObjects', 'usageObjectsAll']) {
        void queryClient.invalidateQueries({ queryKey: [queryKey] });
      }
    },
  });
}
