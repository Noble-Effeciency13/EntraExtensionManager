import { useQuery } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import { fetchAllPages } from '@/graph/paging';

export interface AuditEntry {
  id: string;
  activityDateTime: string;
  activityDisplayName: string;
  category: string;
  result: string;
  initiatedBy?: { user?: { userPrincipalName?: string; displayName?: string } };
  targetResources?: Array<{
    id?: string;
    displayName?: string;
    type?: string;
    userPrincipalName?: string;
  }>;
  modifiedProperties?: Array<{
    displayName?: string;
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  additionalDetails?: Array<{ key?: string; value?: string }>;
}

function normalizeAuditText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function matchesLegacyIdOrName(value: string | null | undefined, needle: string) {
  if (!value || !needle) return false;
  const normalized = normalizeAuditText(needle);
  if (!normalized) return false;
  return normalizeAuditText(value).includes(normalized);
}

export function matchesExtensionAuditEntry(
  entry: AuditEntry,
  extensionIdOrName: string | null,
  qualifiedName?: string | null,
): boolean {
  const needle = (extensionIdOrName ?? '').trim();
  const qualified = (qualifiedName ?? '').trim();
  if (!needle && !qualified) return false;

  const checkString = (value: unknown) => {
    if (typeof value !== 'string') return false;
    const byNeedle = matchesLegacyIdOrName(value, needle);
    const byQualified = qualified ? matchesLegacyIdOrName(value, qualified) : false;
    const byShortName = qualified
      ? matchesLegacyIdOrName(value, qualified.split('_').slice(2).join('_'))
      : false;
    return byNeedle || byQualified || byShortName;
  };

  const targetMatch = (entry.targetResources ?? []).some((target) =>
    [target.id, target.displayName, target.type, target.userPrincipalName].some(checkString),
  );

  const modifiedMatch = (entry.modifiedProperties ?? []).some((property) =>
    [property.displayName, property.oldValue, property.newValue].some(checkString),
  );

  const additionalMatch = (entry.additionalDetails ?? []).some((detail) =>
    [detail.key, detail.value].some(checkString),
  );

  const activityMatch = checkString(entry.activityDisplayName);

  return targetMatch || modifiedMatch || additionalMatch || activityMatch;
}

export function summarizeAuditEntry(
  entry: AuditEntry,
  extensionIdOrName: string | null,
  qualifiedName?: string | null,
) {
  const target =
    entry.targetResources?.find((r) => r.displayName || r.userPrincipalName)?.displayName ??
    entry.targetResources?.[0]?.displayName ??
    entry.targetResources?.[0]?.userPrincipalName ??
    'Unknown target';

  const matchedProperty =
    (entry.modifiedProperties ?? []).find((property) => {
      const haystacks = [property.displayName, property.oldValue, property.newValue];
      return haystacks.some((value) => {
        if (typeof value !== 'string') return false;
        return (
          matchesLegacyIdOrName(value, extensionIdOrName ?? '') ||
          (qualifiedName ? matchesLegacyIdOrName(value, qualifiedName) : false)
        );
      });
    }) ?? entry.modifiedProperties?.[0];

  const detailValue =
    matchedProperty && typeof matchedProperty.newValue !== 'undefined'
      ? matchedProperty.newValue
      : matchedProperty?.oldValue;

  const propertyName = matchedProperty?.displayName ?? 'property';
  const detail =
    typeof detailValue === 'string' && detailValue.length > 0
      ? `${propertyName} = ${detailValue}`
      : typeof detailValue !== 'undefined'
        ? `${propertyName} = ${String(detailValue)}`
        : propertyName;

  return {
    activity: entry.activityDisplayName || 'Audit event',
    target,
    detail,
  };
}

/**
 * Search the directory audit log for entries whose target id, displayName,
 * modified properties, or additional details reference the given extension.
 * We intentionally include both target and property-based matches because many
 * extension value writes never include the extension id in targetResources.
 */
export function useExtensionAuditLog(extensionId: string | null, enabled: boolean) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: ['auditLog', extensionId],
    enabled: enabled && !!extensionId,
    staleTime: 30_000,
    queryFn: async (): Promise<AuditEntry[]> => {
      const client = createGraphClient(await getToken());
      const request = client
        .api('/auditLogs/directoryAudits')
        .select(
          'id,activityDateTime,activityDisplayName,category,result,initiatedBy,targetResources,modifiedProperties,additionalDetails',
        )
        .orderby('activityDateTime desc')
        .top(1000);

      const entries = (await fetchAllPages<AuditEntry>(client, request)) as AuditEntry[];
      return entries.filter((entry) =>
        matchesExtensionAuditEntry(entry, extensionId, extensionId),
      );
    },
  });
}
