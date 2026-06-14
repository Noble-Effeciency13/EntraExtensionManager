import { useQuery } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import type { OpenExtensionResource } from '@/types/extensions';

/** A directory object surfaced by the search picker. */
export interface DirectoryObjectResult {
  id: string;
  displayName: string;
  /** Secondary identifier shown under the name (UPN / mail / deviceId). */
  secondary?: string;
}

interface SearchConfig {
  path: string;
  /** Properties matched by the Graph `$search` expression. */
  searchFields: string[];
  select: string[];
  secondary?: (raw: Record<string, unknown>) => string | undefined;
}

/**
 * Searchable directory collections. Organization is intentionally absent — it
 * is a singleton with no meaningful free-text search (handled separately by
 * {@link useOrganization}).
 */
const SEARCH_CONFIG: Record<
  Exclude<OpenExtensionResource, 'Organization'>,
  SearchConfig
> = {
  User: {
    path: '/users',
    searchFields: ['displayName', 'userPrincipalName', 'mail'],
    select: ['id', 'displayName', 'userPrincipalName'],
    secondary: (o) => o.userPrincipalName as string | undefined,
  },
  Group: {
    path: '/groups',
    searchFields: ['displayName', 'mail'],
    select: ['id', 'displayName', 'mail'],
    secondary: (o) => o.mail as string | undefined,
  },
  Device: {
    path: '/devices',
    searchFields: ['displayName'],
    select: ['id', 'displayName', 'deviceId'],
    secondary: (o) => o.deviceId as string | undefined,
  },
};

/**
 * Type-ahead search across a directory collection using Graph advanced queries
 * (`$search` + ConsistencyLevel: eventual). Callers are expected to debounce
 * the `query` and the hook only runs for queries of 2+ characters, so the
 * directory isn't hammered on every keystroke. Returns up to 25 matches.
 */
export function useDirectoryObjectSearch(
  resource: OpenExtensionResource,
  query: string,
  enabled: boolean,
) {
  const getToken = useGraphToken();
  const trimmed = query.trim();
  const cfg =
    resource === 'Organization' ? null : SEARCH_CONFIG[resource];

  return useQuery({
    queryKey: ['directoryObjectSearch', resource, trimmed] as const,
    enabled: enabled && !!cfg && trimmed.length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<DirectoryObjectResult[]> => {
      const client = createGraphClient(await getToken());
      // Strip quotes so a stray " can't break out of the $search phrase.
      const sanitized = trimmed.replace(/"/g, '');
      const searchExpr = cfg!.searchFields
        .map((f) => `"${f}:${sanitized}"`)
        .join(' OR ');
      const res = await client
        .api(cfg!.path)
        .header('ConsistencyLevel', 'eventual')
        .search(searchExpr)
        .select(cfg!.select.join(','))
        .top(25)
        .get();
      return ((res.value ?? []) as Record<string, unknown>[]).map((raw) => ({
        id: String(raw.id ?? ''),
        displayName: (raw.displayName as string) ?? '(no display name)',
        secondary: cfg!.secondary?.(raw),
      }));
    },
  });
}

/**
 * Resolves the tenant's single organization object. Used to auto-load the
 * Organization resource, which is a singleton and therefore not searchable.
 */
export function useOrganization(enabled: boolean) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['organization'] as const,
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DirectoryObjectResult | null> => {
      const client = createGraphClient(await getToken());
      const res = await client
        .api('/organization')
        .select('id,displayName')
        .get();
      const org = (res.value ?? [])[0] as Record<string, unknown> | undefined;
      if (!org) return null;
      return {
        id: String(org.id ?? ''),
        displayName: (org.displayName as string) ?? 'Organization',
        secondary: String(org.id ?? ''),
      };
    },
  });
}
