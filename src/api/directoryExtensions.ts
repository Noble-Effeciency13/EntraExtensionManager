import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useGraphClient } from '@/graph/useGraphClient';
import { fetchAllPages } from '@/graph/paging';
import type {
  AppRegistration,
  DirectoryExtensionForm,
  DirectoryExtensionProperty,
} from '@/types/extensions';

const QK_ALL = ['directoryExtensions', 'all'] as const;

export interface AppWithExtensions {
  app: AppRegistration;
  extensions: DirectoryExtensionProperty[];
}

/**
 * Loads every app registration in the tenant together with its extensionProperty
 * collection using $expand. Apps with zero extension properties are filtered out.
 * Paginates all pages (apps endpoint is tenant-scoped, not global, so size is
 * bounded by the number of app registrations in this tenant).
 */
export function useAllDirectoryExtensions() {
  const getClient = useGraphClient();
  return useQuery({
    queryKey: QK_ALL,
    queryFn: async (): Promise<AppWithExtensions[]> => {
      const client = await getClient();
      const apps = await fetchAllPages<{
        id: string;
        appId: string;
        displayName: string;
        extensionProperties?: DirectoryExtensionProperty[];
      }>(
        client,
        client
          .api('/applications')
          .select('id,appId,displayName')
          .expand('extensionProperties')
          .top(200),
      );
      const out: AppWithExtensions[] = [];
      for (const raw of apps) {
        const exts = raw.extensionProperties ?? [];
        if (exts.length === 0) continue;
        out.push({
          app: { id: raw.id, appId: raw.appId, displayName: raw.displayName },
          extensions: exts,
        });
      }
      out.sort((a, b) => a.app.displayName.localeCompare(b.app.displayName));
      return out;
    },
  });
}

/**
 * Lightweight query for every appId in the current tenant. Used to filter
 * the global `/schemaExtensions` collection down to schemas owned by an app
 * registered in this tenant. Queried separately from the heavier expanded
 * directory-extensions request so each consumer can fetch only what it needs.
 */
export function useTenantAppIds() {
  const getClient = useGraphClient();
  return useQuery({
    queryKey: ['applications', 'appIds'] as const,
    queryFn: async (): Promise<Set<string>> => {
      const client = await getClient();
      const apps = await fetchAllPages<{ appId?: string }>(
        client,
        client.api('/applications').select('appId').top(999),
      );
      const ids = new Set<string>();
      for (const raw of apps) {
        if (raw.appId) ids.add(raw.appId);
      }
      return ids;
    },
  });
}

export function useCreateExtensionProperty(appObjectId: string) {
  const getClient = useGraphClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DirectoryExtensionForm,
    ): Promise<DirectoryExtensionProperty> => {
      const client = await getClient();
      return client
        .api(`/applications/${appObjectId}/extensionProperties`)
        .post(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ALL }),
  });
}

export function useDeleteExtensionProperty(appObjectId: string) {
  const getClient = useGraphClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (extensionId: string): Promise<void> => {
      const client = await getClient();
      await client
        .api(`/applications/${appObjectId}/extensionProperties/${extensionId}`)
        .delete();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ALL }),
  });
}

/**
 * Variant of useCreateExtensionProperty that accepts the appObjectId at
 * mutate time. Used by the multi-app import flow where the target app varies
 * per row.
 */
export function useImportExtensionProperty() {
  const getClient = useGraphClient();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appObjectId: string;
      payload: DirectoryExtensionForm;
    }): Promise<DirectoryExtensionProperty> => {
      const client = await getClient();
      return client
        .api(`/applications/${input.appObjectId}/extensionProperties`)
        .post(input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ALL }),
  });
}
