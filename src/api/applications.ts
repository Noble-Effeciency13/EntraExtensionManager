import { useQuery } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import type { AppRegistration } from '@/types/extensions';

export function useAppRegistrations(search?: string) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['applications', search ?? ''],
    queryFn: async (): Promise<AppRegistration[]> => {
      const client = createGraphClient(await getToken());
      let request = client
        .api('/applications')
        .select('id,appId,displayName')
        .top(50)
        .orderby('displayName');
      if (search && search.trim().length > 0) {
        const escaped = search.replace(/'/g, "''");
        request = request.filter(`startswith(displayName,'${escaped}')`);
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
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['applications', 'all'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppRegistration[]> => {
      const client = createGraphClient(await getToken());
      const out: AppRegistration[] = [];
      let res = await client
        .api('/applications')
        .select('id,appId,displayName')
        .top(500)
        .get();
      while (res) {
        for (const a of res.value ?? []) {
          out.push({
            id: a.id as string,
            appId: a.appId as string,
            displayName: a.displayName as string,
          });
        }
        const next = res['@odata.nextLink'] as string | undefined;
        if (!next) break;
        res = await client.api(next).get();
      }
      out.sort((a, b) =>
        (a.displayName ?? '').localeCompare(b.displayName ?? ''),
      );
      return out;
    },
  });
}
