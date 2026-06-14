import { useMutation, useQuery } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import type { DirectoryExtensionProperty, SchemaExtension } from '@/types/extensions';

/**
 * Map of supported target object kinds to the Graph collection used to count.
 * Only kinds that the Graph $count + advanced query filter supports.
 * Organization is intentionally excluded: it's a singleton and Graph returns
 * "Raw count (/$count) is not supported because it is used with the unsupported
 * entity 'Organization'".
 */
export const SUPPORTED_COLLECTIONS: Record<string, string> = {
  User: '/users',
  Group: '/groups',
  Device: '/devices',
  Application: '/applications',
  AdministrativeUnit: '/directory/administrativeUnits',
};

/**
 * Per-collection identity columns selected when listing the actual objects
 * behind a usage count. `identifier` extracts a secondary id (UPN/appId/…)
 * from a raw Graph object for display in the drill-down.
 */
export const COLLECTION_IDENTITY: Record<
  string,
  { select: string[]; identifier?: (raw: Record<string, unknown>) => string | undefined }
> = {
  User: {
    select: ['id', 'displayName', 'userPrincipalName'],
    identifier: (o) => o.userPrincipalName as string | undefined,
  },
  Group: {
    select: ['id', 'displayName', 'mailNickname'],
    identifier: (o) => o.mailNickname as string | undefined,
  },
  Device: {
    select: ['id', 'displayName', 'deviceId'],
    identifier: (o) => o.deviceId as string | undefined,
  },
  Application: {
    select: ['id', 'displayName', 'appId'],
    identifier: (o) => o.appId as string | undefined,
  },
  AdministrativeUnit: {
    select: ['id', 'displayName'],
  },
};

export interface UsageRow {
  target: string;
  count: number | null;
  error?: string;
}

async function countWithFilter(
  client: ReturnType<typeof createGraphClient>,
  collection: string,
  filter: string,
): Promise<number> {
  // Advanced query: $count=true requires ConsistencyLevel=eventual on these endpoints.
  const res = await client
    .api(`${collection}/$count`)
    .header('ConsistencyLevel', 'eventual')
    .filter(filter)
    .get();
  if (typeof res === 'number') return res;
  // Graph SDK sometimes returns the body as string for $count
  const n = Number(res);
  if (!Number.isFinite(n)) throw new Error(`Unexpected $count response: ${String(res)}`);
  return n;
}

/**
 * Schema-extension usage: counts resources where the FIRST property of the
 * extension is non-null. Limited to target types that support advanced query.
 */
export function useSchemaExtensionUsage(ext: SchemaExtension | null, enabled: boolean) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['usage', 'schema', ext?.id ?? null],
    enabled: enabled && !!ext && ext.properties.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<UsageRow[]> => {
      const client = createGraphClient(await getToken());
      const probe = ext!.properties[0].name;
      const filter = `${ext!.id}/${probe} ne null`;
      const targets = ext!.targetTypes
        .filter((t) => SUPPORTED_COLLECTIONS[t])
        .map((t) => t);
      return Promise.all(
        targets.map(async (t): Promise<UsageRow> => {
          try {
            const count = await countWithFilter(client, SUPPORTED_COLLECTIONS[t], filter);
            return { target: t, count };
          } catch (e) {
            return { target: t, count: null, error: (e as Error).message };
          }
        }),
      );
    },
  });
}

/**
 * Directory-extension usage: counts resources where the fully-qualified
 * extension attribute is non-null.
 */
export function useDirectoryExtensionUsage(
  ext: DirectoryExtensionProperty | null,
  enabled: boolean,
) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['usage', 'directory', ext?.id ?? null],
    enabled: enabled && !!ext,
    staleTime: 60_000,
    queryFn: async (): Promise<UsageRow[]> => {
      const client = createGraphClient(await getToken());
      const filter = `${ext!.name} ne null`;
      const targets = ext!.targetObjects
        .filter((t) => SUPPORTED_COLLECTIONS[t])
        .map((t) => t);
      return Promise.all(
        targets.map(async (t): Promise<UsageRow> => {
          try {
            const count = await countWithFilter(client, SUPPORTED_COLLECTIONS[t], filter);
            return { target: t, count };
          } catch (e) {
            return { target: t, count: null, error: (e as Error).message };
          }
        }),
      );
    },
  });
}


export interface BulkUsageInput {
  schemas: SchemaExtension[];
  directories: { ext: DirectoryExtensionProperty; appDisplayName: string }[];
  /** Optional progress callback fired after each extension finishes. */
  onEntry?: (entry: BulkUsageEntry, done: number, total: number) => void;
}

export interface BulkUsageEntry {
  key: string;
  kind: 'schema' | 'directory';
  name: string;
  rows: UsageRow[];
  total: number;
  inUse: boolean;
  error?: string;
}

export interface BulkUsageResult {
  entries: BulkUsageEntry[];
  byTarget: Record<string, number>;
  inUse: number;
  notInUse: number;
  errors: number;
}

/**
 * Bulk usage probe across many extensions with bounded concurrency. Exposed
 * as a mutation so the dashboard can fire it on demand instead of on mount.
 *
 * Targets within a single extension fan out in parallel (matching the
 * per-extension hooks); the `concurrency` knob bounds how many extensions
 * are probed simultaneously.
 */
export function useBulkUsageProbe(concurrency = 3) {
  const getToken = useGraphToken();
  return useMutation({
    mutationFn: async (input: BulkUsageInput): Promise<BulkUsageResult> => {
      const client = createGraphClient(await getToken());
      const tasks: Array<() => Promise<BulkUsageEntry>> = [];
      // Target probes within a single extension are intentionally sequential:
      // Graph aggressively throttles concurrent $count requests on the same
      // collection, and the SDK retry middleware honors long Retry-After
      // headers which can stall the whole worker pool for minutes. Worker
      // concurrency below controls the *real* parallelism.
      const probeTargets = async (
        targets: string[],
        filter: string,
      ): Promise<UsageRow[]> => {
        const rows: UsageRow[] = [];
        for (const t of targets) {
          if (!SUPPORTED_COLLECTIONS[t]) continue;
          try {
            const count = await Promise.race([
              countWithFilter(client, SUPPORTED_COLLECTIONS[t], filter),
              new Promise<number>((_, rej) =>
                setTimeout(() => rej(new Error('Timed out after 15s')), 15_000),
              ),
            ]);
            rows.push({ target: t, count });
          } catch (e) {
            rows.push({ target: t, count: null, error: (e as Error).message });
          }
        }
        return rows;
      };

      for (const ext of input.schemas) {
        tasks.push(async () => {
          const probe = ext.properties[0]?.name;
          if (!probe) {
            return {
              key: `schema:${ext.id}`,
              kind: 'schema',
              name: ext.id,
              rows: [],
              total: 0,
              inUse: false,
              error: 'No properties defined',
            };
          }
          const filter = `${ext.id}/${probe} ne null`;
          const rows = await probeTargets(ext.targetTypes, filter);
          const total = rows.reduce((acc, r) => acc + (r.count ?? 0), 0);
          return {
            key: `schema:${ext.id}`,
            kind: 'schema',
            name: ext.id,
            rows,
            total,
            inUse: total > 0,
          };
        });
      }
      for (const { ext } of input.directories) {
        tasks.push(async () => {
          const filter = `${ext.name} ne null`;
          const rows = await probeTargets(ext.targetObjects, filter);
          const total = rows.reduce((acc, r) => acc + (r.count ?? 0), 0);
          return {
            key: `directory:${ext.id}`,
            kind: 'directory',
            name: ext.name,
            rows,
            total,
            inUse: total > 0,
          };
        });
      }
      const entries: BulkUsageEntry[] = [];
      let idx = 0;
      let done = 0;
      async function worker() {
        while (idx < tasks.length) {
          const i = idx++;
          const entry = await tasks[i]();
          entries[i] = entry;
          done += 1;
          input.onEntry?.(entry, done, tasks.length);
        }
      }
      await Promise.all(
        Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
      );
      const byTarget: Record<string, number> = {};
      let inUse = 0;
      let notInUse = 0;
      let errors = 0;
      for (const e of entries) {
        if (e.error) errors += 1;
        if (e.inUse) inUse += 1;
        else notInUse += 1;
        for (const r of e.rows) {
          if (r.count != null && r.count > 0) {
            byTarget[r.target] = (byTarget[r.target] ?? 0) + r.count;
          }
        }
      }
      return { entries, byTarget, inUse, notInUse, errors };
    },
  });
}
