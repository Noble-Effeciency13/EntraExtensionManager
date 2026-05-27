import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import type {
  SchemaExtension,
  SchemaExtensionForm,
  SchemaExtensionStatus,
} from '@/types/extensions';

const QK_BASE = 'schemaExtensions';

export interface SchemaExtensionsPage {
  items: SchemaExtension[];
  nextLink?: string;
}

export interface SchemaExtensionsFilter {
  status?: SchemaExtensionStatus;
  ownerAppId?: string;
}

/**
 * Paginated query for /schemaExtensions. The Graph endpoint is *global* — once
 * a schema extension is marked `Available` it is visible to every tenant — so
 * the response can contain tens of thousands of rows. We page explicitly and
 * let the UI decide when to ask for more.
 */
export function useSchemaExtensions(filter: SchemaExtensionsFilter) {
  const getToken = useGraphToken();
  return useInfiniteQuery({
    queryKey: [QK_BASE, filter] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<SchemaExtensionsPage> => {
      const client = createGraphClient(await getToken());
      let res;
      if (pageParam) {
        res = await client.api(pageParam).get();
      } else {
        let req = client.api('/schemaExtensions').top(100);
        const filters: string[] = [];
        if (filter.status) filters.push(`status eq '${filter.status}'`);
        if (filter.ownerAppId) {
          const ownerEsc = filter.ownerAppId.replace(/'/g, "''");
          filters.push(`owner eq '${ownerEsc}'`);
        }
        if (filters.length > 0) req = req.filter(filters.join(' and '));
        res = await req.get();
      }
      return {
        items: (res.value ?? []) as SchemaExtension[],
        nextLink: res['@odata.nextLink'] as string | undefined,
      };
    },
    getNextPageParam: (last) => last.nextLink,
  });
}

export function useCreateSchemaExtension() {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SchemaExtensionForm): Promise<SchemaExtension> => {
      const client = createGraphClient(await getToken());
      const body: Record<string, unknown> = {
        id: input.id,
        description: input.description ?? '',
        targetTypes: input.targetTypes,
        properties: input.properties,
      };
      if (input.owner) body.owner = input.owner;
      return client.api('/schemaExtensions').post(body);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_BASE] }),
  });
}

export interface UpdateSchemaExtensionInput {
  id: string;
  description?: string;
  targetTypes?: string[];
  properties?: SchemaExtensionForm['properties'];
}

export function useUpdateSchemaExtension() {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateSchemaExtensionInput): Promise<void> => {
      const client = createGraphClient(await getToken());
      const { id, ...patch } = input;
      await client.api(`/schemaExtensions/${id}`).patch(patch);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_BASE] }),
  });
}

export function useSetSchemaExtensionStatus() {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      status: SchemaExtensionStatus;
    }): Promise<void> => {
      const client = createGraphClient(await getToken());
      await client.api(`/schemaExtensions/${input.id}`).patch({ status: input.status });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_BASE] }),
  });
}

export function useDeleteSchemaExtension() {
  const getToken = useGraphToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const client = createGraphClient(await getToken());
      await client.api(`/schemaExtensions/${id}`).delete();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK_BASE] }),
  });
}
