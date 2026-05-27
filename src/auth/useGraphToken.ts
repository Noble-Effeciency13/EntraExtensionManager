import { useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { useMode } from './mode';

/**
 * Returns a function that yields a Graph access token scoped to the currently
 * selected mode (read vs edit). Falls back to a popup prompt when silent
 * acquisition fails (e.g. the user hasn't yet consented to the edit scopes).
 */
export function useGraphToken() {
  const { instance, accounts } = useMsal();
  const { scopes } = useMode();

  return useCallback(async (): Promise<string> => {
    const account = instance.getActiveAccount() ?? accounts[0];
    if (!account) {
      throw new Error('No signed-in account.');
    }
    try {
      const result = await instance.acquireTokenSilent({ account, scopes });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        const result = await instance.acquireTokenPopup({ scopes });
        return result.accessToken;
      }
      throw err;
    }
  }, [instance, accounts, scopes]);
}
