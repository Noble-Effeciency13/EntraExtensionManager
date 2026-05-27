import { useMemo } from 'react';
import { useSchemaExtensions } from '@/api/schemaExtensions';
import {
  useAllDirectoryExtensions,
  useTenantAppIds,
} from '@/api/directoryExtensions';
import type { SchemaExtensionStatus } from '@/types/extensions';

export interface ExtensionsAggregates {
  loading: boolean;
  error?: unknown;
  total: number;
  schemaCount: number;
  directoryCount: number;
  byTarget: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  byDataType: { label: string; value: number }[];
  byOwner: { label: string; value: number }[];
  byKind: { label: string; value: number }[];
}

/**
 * Derives lightweight aggregates from the existing schema + directory lists so
 * each Tools dashboard can render charts without extra Graph calls.
 *
 * `tenantOnly` filters the global `/schemaExtensions` list down to schemas
 * owned by an app registered in the current tenant.
 */
export function useExtensionsAggregates(
  schemaStatus: SchemaExtensionStatus | 'All' = 'InDevelopment',
  options: { tenantOnly?: boolean } = {},
) {
  const { tenantOnly = false } = options;
  const schemaQ = useSchemaExtensions({
    status: schemaStatus === 'All' ? undefined : schemaStatus,
  });
  const dirQ = useAllDirectoryExtensions();
  const tenantAppsQ = useTenantAppIds();

  return useMemo(() => {
    const allSchemas = (schemaQ.data?.pages ?? []).flatMap((p) => p.items);
    const tenantIds = tenantAppsQ.data;
    const schemas =
      tenantOnly && tenantIds
        ? allSchemas.filter((s) => s.owner && tenantIds.has(s.owner))
        : allSchemas;
    const directories: {
      ext: import('@/types/extensions').DirectoryExtensionProperty;
      appDisplayName: string;
    }[] = [];
    for (const group of dirQ.data ?? []) {
      for (const ext of group.extensions) {
        directories.push({ ext, appDisplayName: group.app.displayName });
      }
    }

    const total = schemas.length + directories.length;
    const targetCount: Record<string, number> = {};
    const statusCount: Record<string, number> = {};
    const dataTypeCount: Record<string, number> = {};
    const ownerCount: Record<string, number> = {};

    for (const s of schemas) {
      statusCount[s.status] = (statusCount[s.status] ?? 0) + 1;
      ownerCount[s.owner || 'unknown'] = (ownerCount[s.owner || 'unknown'] ?? 0) + 1;
      for (const t of s.targetTypes) {
        targetCount[t] = (targetCount[t] ?? 0) + 1;
      }
    }
    for (const { ext, appDisplayName } of directories) {
      dataTypeCount[ext.dataType] = (dataTypeCount[ext.dataType] ?? 0) + 1;
      ownerCount[appDisplayName] = (ownerCount[appDisplayName] ?? 0) + 1;
      for (const t of ext.targetObjects) {
        targetCount[t] = (targetCount[t] ?? 0) + 1;
      }
    }

    const toPairs = (rec: Record<string, number>) =>
      Object.entries(rec).map(([label, value]) => ({ label, value }));

    return {
      loading:
        schemaQ.isLoading ||
        dirQ.isLoading ||
        (tenantOnly && tenantAppsQ.isLoading),
      error: schemaQ.error || dirQ.error || tenantAppsQ.error,
      total,
      schemaCount: schemas.length,
      directoryCount: directories.length,
      schemas,
      directories,
      byKind: [
        { label: 'Schema', value: schemas.length },
        { label: 'Directory', value: directories.length },
      ].filter((d) => d.value > 0),
      byTarget: toPairs(targetCount),
      byStatus: toPairs(statusCount),
      byDataType: toPairs(dataTypeCount),
      byOwner: toPairs(ownerCount),
    };
  }, [
    schemaQ.data,
    dirQ.data,
    tenantAppsQ.data,
    tenantOnly,
    schemaQ.isLoading,
    dirQ.isLoading,
    tenantAppsQ.isLoading,
    schemaQ.error,
    dirQ.error,
    tenantAppsQ.error,
  ]);
}
