import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMode } from './mode';
import { buildTenantAuthority } from './msalConfig';

/**
 * Returns a function that yields a Graph access token scoped to the currently
 * selected mode (read vs edit). Falls back to a popup prompt when silent
 * acquisition fails (e.g. the user hasn't yet consented to the edit scopes).
 * Always targets the active account's tenant.
 */
export function useGraphToken() {
  const { instance, accounts } = useMsal();
  const { scopes } = useMode();

  return useCallback(async (): Promise<string> => {
    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) {
      throw new Error('No signed-in account.');
    }
    const authority = buildTenantAuthority(account.tenantId);
    try {
      const result = await instance.acquireTokenSilent({ account, scopes, authority });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect({ scopes, authority });
        // Browser navigates away — this line is unreachable but satisfies
        // the TypeScript compiler's return-type requirement.
        throw new Error('Redirecting for authentication…');
      }
      throw err;
    }
  }, [instance, accounts, scopes]);
}
