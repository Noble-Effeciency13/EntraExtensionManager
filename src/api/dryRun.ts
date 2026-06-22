import { useMutation } from '@tanstack/react-query';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';

const COLLECTIONS: Record<string, string> = {
  User: '/users',
  Group: '/groups',
  Device: '/devices',
  Application: '/applications',
  Organization: '/organization',
  AdministrativeUnit: '/directory/administrativeUnits',
};

export interface AssignInput {
  /** Object-type token: User, Group, Device, etc. */
  targetType: string;
  /** Object id (or UPN for User). */
  targetId: string;
  /**
   * Extension attribute name (fully qualified for directory extensions).
   * Pass `null` to clear the value.
   */
  attribute: string;
  /** The value to write. Pass `null` to clear. */
  value: unknown;
}

export interface AssignResult {
  readBack: unknown;
}

/**
 * Writes an extension attribute value onto a target directory object and reads
 * it back to confirm. Unlike the dry-run, the value is NOT cleaned up — this
 * is a real, persisted write. Requires Edit mode (Directory.ReadWrite.All).
 */
export function useAssignExtensionValue() {
  const getToken = useGraphToken();
  return useMutation({
    mutationFn: async (input: AssignInput): Promise<AssignResult> => {
      const collection = COLLECTIONS[input.targetType];
      if (!collection) throw new Error(`Unsupported target type: ${input.targetType}`);
      const client = createGraphClient(await getToken());
      const patchBody = { [input.attribute]: input.value };
      await client
        .api(`${collection}/${encodeURIComponent(input.targetId)}`)
        .patch(patchBody);
      let readBack: unknown = null;
      try {
        readBack = await client
          .api(`${collection}/${encodeURIComponent(input.targetId)}`)
          .select(input.attribute)
          .get();
      } catch {
        /* write succeeded; read-back is best-effort */
      }
      return { readBack };
    },
  });
}

export interface DryRunInput {
  /** Object-type token: User, Group, Device, etc. */
  targetType: string;
  /** Object id (or UPN for User). */
  targetId: string;
  /** Extension attribute name (fully qualified for directory extensions, or
   *  bare extension id for schema extensions — the body is the same shape). */
  attribute: string;
  /** The value to PATCH. For schema extensions, an object of property values. */
  value: unknown;
}

export interface DryRunResult {
  written: unknown;
  readBack: unknown;
  cleanedUp: boolean;
}

/**
 * Writes a single extension value to a target resource, reads it back, then
 * clears it. Used by the "Validate value" tool. Requires write scopes on the
 * target object type (covered by Directory.ReadWrite.All in Edit mode).
 */
export function useDryRunExtensionValue() {
  const getToken = useGraphToken();
  return useMutation({
    mutationFn: async (input: DryRunInput): Promise<DryRunResult> => {
      const collection = COLLECTIONS[input.targetType];
      if (!collection) throw new Error(`Unsupported target type: ${input.targetType}`);
      const client = createGraphClient(await getToken());

      const patchBody = { [input.attribute]: input.value };
      const cleanupBody = { [input.attribute]: null };

      const written = await client
        .api(`${collection}/${encodeURIComponent(input.targetId)}`)
        .patch(patchBody);

      let readBack: unknown = null;
      try {
        readBack = await client
          .api(`${collection}/${encodeURIComponent(input.targetId)}`)
          .select(input.attribute)
          .get();
      } catch {
        /* ignore — write succeeded which is what we report */
      }

      let cleanedUp = false;
      try {
        await client
          .api(`${collection}/${encodeURIComponent(input.targetId)}`)
          .patch(cleanupBody);
        cleanedUp = true;
      } catch {
        cleanedUp = false;
      }

      return { written, readBack, cleanedUp };
    },
  });
}
