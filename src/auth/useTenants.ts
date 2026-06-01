import { useState, useCallback, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { buildTenantAuthority } from './msalConfig';

const MANAGEMENT_SCOPE = 'https://management.azure.com/user_impersonation';
const TENANTS_ENDPOINT = 'https://management.azure.com/tenants?api-version=2022-12-01';

export interface TenantInfo {
  tenantId: string;
  displayName: string;
  defaultDomain: string;
  tenantCategory: string;
}

interface TenantsResponse {
  value: TenantInfo[];
}

export interface UseTenants {
  tenants: TenantInfo[];
  loading: boolean;
  error: Error | null;
  hasFetched: boolean;
  /**
   * True when silent token acquisition failed because the management scope
   * hasn't been consented yet. Call fetchTenants(true) from a click handler to
   * trigger the interactive consent popup (browser requires user gesture).
   */
  needsConsent: boolean;
  fetchTenants: (allowInteraction?: boolean) => Promise<void>;
}

/**
 * Fetches all Azure AD tenants the signed-in user is a member of via the
 * Azure Management REST API (`management.azure.com/tenants`).
 *
 * On mount it attempts a silent token acquisition so the list is ready before
 * the user opens the switcher. If the management scope hasn't been consented
 * yet, it sets `needsConsent` instead of opening a popup automatically
 * (popup blockers reject non-click-initiated popups). The caller should then
 * invoke `fetchTenants()` from a user-gesture handler to trigger the
 * interactive consent flow.
 */
export function useTenants(): UseTenants {
  const { instance, accounts } = useMsal();
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  const fetchTenants = useCallback(
    async (allowInteraction = true) => {
      const account = instance.getActiveAccount() ?? accounts[0];
      if (!account) return;

      setLoading(true);
      setError(null);
      setNeedsConsent(false);

      try {
        const authority = buildTenantAuthority(account.tenantId);
        let tokenResult;

        try {
          tokenResult = await instance.acquireTokenSilent({
            account,
            scopes: [MANAGEMENT_SCOPE],
            authority,
          });
        } catch (err) {
          if (err instanceof InteractionRequiredAuthError) {
            if (!allowInteraction) {
              // Called from useEffect — cannot open popup without user gesture.
              setNeedsConsent(true);
              return;
            }
            // Called from a click handler — popup is allowed by the browser.
            tokenResult = await instance.acquireTokenPopup({
              account,
              scopes: [MANAGEMENT_SCOPE],
              authority,
            });
          } else {
            throw err;
          }
        }

        const response = await fetch(TENANTS_ENDPOINT, {
          headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Failed to load tenants: HTTP ${response.status}`);
        }

        const data = (await response.json()) as TenantsResponse;
        setTenants(data.value ?? []);
        setHasFetched(true);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setHasFetched(true);
      } finally {
        setLoading(false);
      }
    },
    [instance, accounts],
  );

  // Auto-fetch silently as soon as an account is available so the list is
  // pre-populated before the user opens the switcher dropdown.
  const accountId = (instance.getActiveAccount() ?? accounts[0])?.homeAccountId;
  useEffect(() => {
    if (accountId) {
      void fetchTenants(false);
    }
    // Re-fetch when the signed-in account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  return { tenants, loading, error, hasFetched, needsConsent, fetchTenants };
}
