import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import type {
  OpenExtensionInstance,
  OpenExtensionResource,
} from '@/types/extensions';

/** Graph collection backing each open-extension-capable resource kind. */
const RESOURCE_PATH: Record<OpenExtensionResource, string> = {
  User: '/users',
  Group: '/groups',
  Device: '/devices',
  Organization: '/organization',
};

const OPEN_EXTENSION_TYPE = 'microsoft.graph.openTypeExtension';

/** Reserved fields that are not part of the user-defined open extension data. */
const RESERVED_KEYS = new Set([
  '@odata.type',
  '@odata.context',
  '@odata.id',
  'id',
  'extensionName',
]);

function resourceBase(resource: OpenExtensionResource, objectId: string): string {
  return `${RESOURCE_PATH[resource]}/${encodeURIComponent(objectId)}/extensions`;
}

/** Splits a raw Graph extension object into its id and custom data payload. */
function toInstance(raw: Record<string, unknown>): OpenExtensionInstance {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!RESERVED_KEYS.has(k)) data[k] = v;
  }
  return {
    id: String(raw.id ?? raw.extensionName ?? ''),
    data,
  };
}

function queryKey(resource: OpenExtensionResource, objectId: string) {
  return ['openExtensions', resource, objectId] as const;
}

/**
 * Lists the open extensions (Microsoft.Graph.openTypeExtension) stored on a
 * single directory object. Only fetches when `enabled` and an object id is
 * supplied. Non-open extension types returned by the `extensions` navigation
 * property are filtered out.
 */
export function useOpenExtensions(
  resource: OpenExtensionResource,
  objectId: string,
  enabled: boolean,
) {
  const getToken = useGraphToken();
  return useQuery({
    queryKey: queryKey(resource, objectId),
    enabled: enabled && !!objectId.trim(),
    queryFn: async (): Promise<OpenExtensionInstance[]> => {
      const client = createGraphClient(await getToken());
      const out: OpenExtensionInstance[] = [];
      let res = await client.api(resourceBase(resource, objectId.trim())).get();
      while (res) {
        for (const raw of (res.value ?? []) as Record<string, unknown>[]) {
          const type = String(raw['@odata.type'] ?? '').toLowerCase();
          // The `extensions` collection only returns open extensions today, but
          // guard against other types defensively when a type hint is present.
          if (type && !type.includes('opentypeextension')) continue;
          out.push(toInstance(raw));
        }
        const next = res['@odata.nextLink'] as string | undefined;
        if (!next) break;
        res = await client.api(next).get();
      }
      out.sort((a, b) => a.id.localeCompare(b.id));
      return out;
    },
  });
}

export interface OpenExtensionInput {
  extensionName: string;
  data: Record<string, unknown>;
}

/** Creates a new open extension on the target object (Edit mode). */
export function useCreateOpenExtension(
  resource: OpenExtensionResource,
  objectId: string,
) {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpenExtensionInput): Promise<void> => {
      const client = createGraphClient(await getToken());
      await client.api(resourceBase(resource, objectId.trim())).post({
        '@odata.type': OPEN_EXTENSION_TYPE,
        extensionName: input.extensionName,
        ...input.data,
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKey(resource, objectId) }),
  });
}

/** Replaces the custom data of an existing open extension (Edit mode). */
export function useUpdateOpenExtension(
  resource: OpenExtensionResource,
  objectId: string,
) {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: OpenExtensionInput): Promise<void> => {
      const client = createGraphClient(await getToken());
      await client
        .api(
          `${resourceBase(resource, objectId.trim())}/${encodeURIComponent(
            input.extensionName,
          )}`,
        )
        .patch({ ...input.data });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKey(resource, objectId) }),
  });
}

/** Deletes an open extension from the target object (Edit mode). */
export function useDeleteOpenExtension(
  resource: OpenExtensionResource,
  objectId: string,
) {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (extensionName: string): Promise<void> => {
      const client = createGraphClient(await getToken());
      await client
        .api(
          `${resourceBase(resource, objectId.trim())}/${encodeURIComponent(
            extensionName,
          )}`,
        )
        .delete();
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKey(resource, objectId) }),
  });
}
