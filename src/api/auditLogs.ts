import { useQuery } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';

export interface AuditEntry {
  id: string;
  activityDateTime: string;
  activityDisplayName: string;
  category: string;
  result: string;
  initiatedBy?: { user?: { userPrincipalName?: string; displayName?: string } };
  targetResources?: Array<{ id?: string; displayName?: string; type?: string }>;
}

/**
 * Search the directory audit log for entries whose target id, displayName, or
 * additionalDetails reference the given extension id. Hit-or-miss across Graph
 * service tags, but useful as a "last touched" surface.
 */
export function useExtensionAuditLog(extensionId: string | null, enabled: boolean) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['auditLog', extensionId],
    enabled: enabled && !!extensionId,
    staleTime: 30_000,
    queryFn: async (): Promise<AuditEntry[]> => {
      const client = createGraphClient(await getToken());
      // Filter on targetResources/any() with id eq is broadly supported.
      const filter = `targetResources/any(t:t/id eq '${extensionId}')`;
      const res = await client
        .api('/auditLogs/directoryAudits')
        .filter(filter)
        .top(50)
        .orderby('activityDateTime desc')
        .get();
      return (res.value ?? []) as AuditEntry[];
    },
  });
}
