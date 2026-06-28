import { useQuery } from '@tanstack/react-query';
import { useGraphClient } from '@/graph/useGraphClient';
import { fetchAllPages } from '@/graph/paging';
import { escapeODataString } from '@/graph/odata';
import type { AppRegistration } from '@/types/extensions';

export function useAppRegistrations(search?: string) {
  const getClient = useGraphClient();
  return useQuery({
    queryKey: ['applications', search ?? ''],
    queryFn: async (): Promise<AppRegistration[]> => {
      const client = await getClient();
      let request = client
        .api('/applications')
        .select('id,appId,displayName')
        .top(50)
        .orderby('displayName');
      if (search && search.trim().length > 0) {
        request = request.filter(
          `startswith(displayName,'${escapeODataString(search.trim())}')`,
        );
      }
      const res = await request.get();
      return res.value as AppRegistration[];
    },
  });
}

/**
 * Loads every application in the tenant (paginated). Used by the app picker
 * when creating an extensionProperty on an app that has none yet, so it has
 * to include apps that are filtered out of `useAllDirectoryExtensions`.
 */
export function useAllApplications(enabled: boolean = true) {
  const getClient = useGraphClient();
  return useQuery({
    queryKey: ['applications', 'all'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRegistration[]> => {
      const client = await getClient();
      const apps = await fetchAllPages<{
        id: string;
        appId: string;
        displayName: string;
      }>(
        client,
        client.api('/applications').select('id,appId,displayName').top(500),
      );
      const out: AppRegistration[] = apps.map((a) => ({
        id: a.id,
        appId: a.appId,
        displayName: a.displayName,
      }));
      out.sort((a, b) => (a.displayName ?? '').localeCompare(b.displayName ?? ''));
      return out;
    },
  });
}
