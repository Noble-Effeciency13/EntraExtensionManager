import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
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
  const getToken = useGraphToken();
  return useQuery({
    queryKey: QK_ALL,
    queryFn: async (): Promise<AppWithExtensions[]> => {
      const client = createGraphClient(await getToken());
      const out: AppWithExtensions[] = [];
      let res = await client
        .api('/applications')
        .select('id,appId,displayName')
        .expand('extensionProperties')
        .top(200)
        .get();
      while (res) {
        for (const raw of res.value ?? []) {
          const exts = (raw.extensionProperties ?? []) as DirectoryExtensionProperty[];
          if (exts.length === 0) continue;
          out.push({
            app: {
              id: raw.id as string,
              appId: raw.appId as string,
              displayName: raw.displayName as string,
            },
            extensions: exts,
          });
        }
        const next = res['@odata.nextLink'] as string | undefined;
        if (!next) break;
        res = await client.api(next).get();
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
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['applications', 'appIds'] as const,
    queryFn: async (): Promise<Set<string>> => {
      const client = createGraphClient(await getToken());
      const ids = new Set<string>();
      let res = await client
        .api('/applications')
        .select('appId')
        .top(999)
        .get();
      while (res) {
        for (const raw of res.value ?? []) {
          if (raw.appId) ids.add(raw.appId as string);
        }
        const next = res['@odata.nextLink'] as string | undefined;
        if (!next) break;
        res = await client.api(next).get();
      }
      return ids;
    },
  });
}

export function useCreateExtensionProperty(appObjectId: string) {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: DirectoryExtensionForm,
    ): Promise<DirectoryExtensionProperty> => {
      const client = createGraphClient(await getToken());
      return client
        .api(`/applications/${appObjectId}/extensionProperties`)
        .post(input);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ALL }),
  });
}

export function useDeleteExtensionProperty(appObjectId: string) {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (extensionId: string): Promise<void> => {
      const client = createGraphClient(await getToken());
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
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      appObjectId: string;
      payload: DirectoryExtensionForm;
    }): Promise<DirectoryExtensionProperty> => {
      const client = createGraphClient(await getToken());
      return client
        .api(`/applications/${input.appObjectId}/extensionProperties`)
        .post(input.payload);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: QK_ALL }),
  });
}
