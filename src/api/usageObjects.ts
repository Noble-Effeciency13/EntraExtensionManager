import { useInfiniteQuery, useQueries } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';
import { COLLECTION_IDENTITY, SUPPORTED_COLLECTIONS } from '@/api/usage';
import type {
  DirectoryExtensionProperty,
  ExtensionObjectRow,
  ExtensionObjectsPage,
  SchemaExtension,
} from '@/types/extensions';

export type { ExtensionObjectRow };

/**
 * Discriminated input describing which extension + target collection to list
 * the underlying objects for.
 */
export type ObjectsInput =
  | { variant: 'schema'; ext: SchemaExtension; target: string }
  | { variant: 'directory'; ext: DirectoryExtensionProperty; target: string };

/**
 * Derives the short, human-friendly property name from a fully-qualified
 * directory extension name (`extension_{appId}_{name}` -> `{name}`).
 */
export function directoryShortName(fullName: string): string {
  const parts = fullName.split('_');
  return parts.length >= 3 ? parts.slice(2).join('_') : fullName;
}

/**
 * Returns the subset of an extension's declared target types that can actually
 * be drilled into (i.e. are listable directory collections). Mailbox-bound
 * schema targets (Message/Event/Post/Contact) and the Organization singleton
 * are intentionally excluded.
 */
export function probeableTargets(
  variant: 'schema' | 'directory',
  ext: SchemaExtension | DirectoryExtensionProperty,
): string[] {
  const targets =
    variant === 'schema'
      ? (ext as SchemaExtension).targetTypes
      : (ext as DirectoryExtensionProperty).targetObjects;
  return targets.filter((t) => SUPPORTED_COLLECTIONS[t]);
}

/** Whether a schema extension has at least one property to probe on. */
export function canProbe(input: ObjectsInput): boolean {
  if (input.variant === 'schema') return input.ext.properties.length > 0;
  return true;
}

function buildProbe(input: ObjectsInput): { filter: string; valueKey: string } {
  if (input.variant === 'schema') {
    const probe = input.ext.properties[0]?.name;
    return { filter: `${input.ext.id}/${probe} ne null`, valueKey: input.ext.id };
  }
  return { filter: `${input.ext.name} ne null`, valueKey: input.ext.name };
}

function extractValues(
  raw: Record<string, unknown>,
  input: ObjectsInput,
  valueKey: string,
): Record<string, unknown> {
  if (input.variant === 'schema') {
    const v = raw[valueKey];
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  }
  return { [directoryShortName(valueKey)]: raw[valueKey] ?? null };
}

/**
 * Lazily lists the directory objects that carry a non-null value for the given
 * extension on a single target collection, together with the stored values.
 *
 * Uses Graph advanced queries ($filter `ne null` + $count + ConsistencyLevel:
 * eventual) and follows `@odata.nextLink` one page at a time. Only fetches when
 * `enabled` is true so opening the Usage drill-down stays on-demand.
 */
export function useExtensionObjects(
  input: ObjectsInput,
  enabled: boolean,
  pageSize = 50,
) {
  const getToken = useGraphToken();
  const key =
    input.variant === 'schema' ? input.ext.id : input.ext.name;

  return useInfiniteQuery<ExtensionObjectsPage>({
    queryKey: ['usageObjects', input.variant, key, input.target, pageSize] as const,
    enabled: enabled && !!SUPPORTED_COLLECTIONS[input.target] && canProbe(input),
    initialPageParam: undefined as string | undefined,
    staleTime: 60_000,
    getNextPageParam: (last) => last.nextLink,
    queryFn: async ({ pageParam }): Promise<ExtensionObjectsPage> => {
      const client = createGraphClient(await getToken());
      const collection = SUPPORTED_COLLECTIONS[input.target];
      const identity = COLLECTION_IDENTITY[input.target];
      const { filter, valueKey } = buildProbe(input);
      const select = [...identity.select, valueKey].join(',');

      const res = pageParam
        ? await client
            .api(pageParam as string)
            .header('ConsistencyLevel', 'eventual')
            .get()
        : await client
            .api(collection)
            .header('ConsistencyLevel', 'eventual')
            .count(true)
            .filter(filter)
            .select(select)
            .top(pageSize)
            .get();

      const rows: ExtensionObjectRow[] = (res.value ?? []).map(
        (raw: Record<string, unknown>) => ({
          id: String(raw.id ?? ''),
          displayName: (raw.displayName as string) ?? '(no display name)',
          identifier: identity.identifier?.(raw),
          values: extractValues(raw, input, valueKey),
        }),
      );

      return {
        rows,
        nextLink: res['@odata.nextLink'] as string | undefined,
        totalCount: res['@odata.count'] as number | undefined,
      };
    },
  });
}

/** An {@link ExtensionObjectRow} annotated with which target collection it came from. */
export interface ExtensionObjectRowWithTarget extends ExtensionObjectRow {
  target: string;
}

/**
 * Fetches objects for ALL probeable targets of an extension simultaneously,
 * walking pages up to `cap` per target and returning a flat merged list
 * annotated with the target type. Used by the "All target types" view in
 * the Usage monitor drill-down.
 *
 * Unlike {@link useExtensionObjects}, each target fetches eagerly (all pages
 * up to the cap) so that a single "Load more" mechanism isn't needed.
 */
export function useMultiTargetObjects(
  inputs: ObjectsInput[],
  enabled: boolean,
  cap = 200,
) {
  const getToken = useGraphToken();

  return useQueries({
    queries: inputs.map((input) => ({
      queryKey: [
        'usageObjectsAll',
        input.variant,
        input.variant === 'schema' ? input.ext.id : input.ext.name,
        input.target,
        cap,
      ] as const,
      enabled: enabled && !!SUPPORTED_COLLECTIONS[input.target] && canProbe(input),
      staleTime: 60_000,
      queryFn: async (): Promise<ExtensionObjectRowWithTarget[]> => {
        const client = createGraphClient(await getToken());
        const collection = SUPPORTED_COLLECTIONS[input.target];
        const identity = COLLECTION_IDENTITY[input.target];
        const { filter, valueKey } = buildProbe(input);
        const select = [...identity.select, valueKey].join(',');

        const allRows: ExtensionObjectRowWithTarget[] = [];
        let nextLink: string | undefined;

        do {
          const res = nextLink
            ? await client
                .api(nextLink)
                .header('ConsistencyLevel', 'eventual')
                .get()
            : await client
                .api(collection)
                .header('ConsistencyLevel', 'eventual')
                .count(true)
                .filter(filter)
                .select(select)
                .top(100)
                .get();

          const page = ((res.value ?? []) as Record<string, unknown>[]).map(
            (raw): ExtensionObjectRowWithTarget => ({
              id: String(raw.id ?? ''),
              displayName: (raw.displayName as string) ?? '(no display name)',
              identifier: identity.identifier?.(raw),
              values: extractValues(raw, input, valueKey),
              target: input.target,
            }),
          );
          allRows.push(...page);
          nextLink = res['@odata.nextLink'] as string | undefined;
        } while (nextLink && allRows.length < cap);

        return allRows;
      },
    })),
    combine: (results) => ({
      rows: results.flatMap((r) => r.data ?? []),
      isLoading: results.some((r) => r.isLoading),
      isFetching: results.some((r) => r.isFetching),
      errors: results
        .filter((r) => r.error instanceof Error)
        .map((r) => r.error as Error),
      refetchAll: () => {
        results.forEach((r) => { void r.refetch(); });
      },
      isCapped: results.some((r) => (r.data?.length ?? 0) >= cap),
    }),
  });
}
