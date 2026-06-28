import { useCallback } from 'react';
import type { Client } from '@microsoft/microsoft-graph-client';
import { createGraphClient } from '@/graph/client';
import { useGraphToken } from '@/auth/useGraphToken';

/**
 * Returns a function that resolves a ready-to-use Microsoft Graph {@link Client}
 * scoped to the current mode (read/edit) and tenant. In demo mode the returned
 * client is the offline simulator (handled transparently by the token +
 * {@link createGraphClient} seam), so callers never branch on demo state.
 *
 * Replaces the `createGraphClient(await getToken())` boilerplate that every
 * data hook used to repeat.
 */
export function useGraphClient(): () => Promise<Client> {
  const getToken = useGraphToken();
  return useCallback(async () => createGraphClient(await getToken()), [getToken]);
}
