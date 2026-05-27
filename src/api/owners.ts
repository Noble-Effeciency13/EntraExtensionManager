import { useQueries } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';

/**
 * Resolve the home tenant (appOwnerOrganizationId) for one or more
 * Entra application appIds. Uses /servicePrincipals because the
 * /applications resource is local to the current tenant only and won't
 * include multi-tenant publishers.
 */
export function useOwnerTenantIds(appIds: string[], enabled: boolean) {
  const getToken = useGraphToken();
  const unique = Array.from(new Set(appIds.filter(Boolean)));

  const results = useQueries({
    queries: unique.map((appId) => ({
      queryKey: ['ownerTenantId', appId],
      enabled: enabled && !!appId,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      queryFn: async (): Promise<string | null> => {
        const client = createGraphClient(await getToken());
        const res = await client
          .api('/servicePrincipals')
          .filter(`appId eq '${appId}'`)
          .select('appOwnerOrganizationId')
          .top(1)
          .get();
        const sp = res.value?.[0];
        return (sp?.appOwnerOrganizationId as string | undefined) ?? null;
      },
    })),
  });

  const map = new Map<string, { tenantId: string | null; isLoading: boolean }>();
  unique.forEach((appId, i) => {
    const r = results[i];
    map.set(appId, {
      tenantId: (r.data as string | null | undefined) ?? null,
      isLoading: r.isLoading,
    });
  });
  return map;
}
