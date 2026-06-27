import { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import {
  ArrowSwap20Regular,
  Building20Regular,
  Checkmark20Regular,
  Warning20Regular,
  ArrowClockwise20Regular,
  Key20Regular,
} from '@fluentui/react-icons';
import { useTenants, TenantInfo } from '@/auth/useTenants';
import { buildTenantAuthority, readScopes } from '@/auth/msalConfig';
import { useAppToast } from '@/hooks/useAppToast';
import { useDemo } from '@/demo/DemoContext';

const useStyles = makeStyles({
  tenantItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  tenantItemSub: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
});

export function TenantSwitcher() {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const { isDemo } = useDemo();
  const qc = useQueryClient();
  const toast = useAppToast();
  const { tenants, loading, error, needsConsent, fetchTenants } = useTenants();
  const [switching, setSwitching] = useState(false);

  const activeAccount = instance.getActiveAccount() ?? accounts[0];
  const activeTenantId = isDemo ? tenants[0]?.tenantId : activeAccount?.tenantId;

  const handleSwitch = async (tenant: TenantInfo) => {
    if (tenant.tenantId === activeTenantId || switching) return;
    if (isDemo) {
      toast.success('Tenant switch (simulated)', tenant.displayName);
      return;
    }
    setSwitching(true);
    try {
      // If we already have a cached MSAL account for this tenant, just activate
      // it — no consent popup needed.
      const cached = accounts.find((a) => a.tenantId === tenant.tenantId);
      if (cached) {
        instance.setActiveAccount(cached);
      } else {
        // First visit to this tenant: loginRedirect handles consent
        // automatically (AAD only shows the consent screen when the app
        // hasn't been granted access in that tenant yet). The active account
        // is set by the event callback in main.tsx on return.
        // Persist the success message so AppShell can show it after reload.
        sessionStorage.setItem(
          'eem.pendingToast',
          JSON.stringify({ title: 'Tenant switched', body: tenant.displayName }),
        );
        await instance.loginRedirect({
          authority: buildTenantAuthority(tenant.tenantId),
          scopes: readScopes,
          prompt: 'select_account',
        });
        // Browser navigates away — code below is unreachable.
      }
      await qc.invalidateQueries();
      toast.success('Tenant switched', `Now connected to ${tenant.displayName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('user_cancelled')) {
        toast.error(
          'Tenant switch failed',
          err instanceof Error ? err : new Error(msg),
        );
      }
    } finally {
      setSwitching(false);
    }
  };

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          icon={switching ? <Spinner size="tiny" /> : <ArrowSwap20Regular />}
          disabled={switching}
          aria-label="Tenant switcher"
        >
          Tenant switcher
        </Button>
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {loading && (
            <MenuItem icon={<Spinner size="tiny" />} disabled>
              Loading tenants…
            </MenuItem>
          )}

          {!loading && needsConsent && (
            <>
              <MenuItem
                icon={<Key20Regular />}
                onClick={() => void fetchTenants(true)}
              >
                Grant access to list tenants
              </MenuItem>
              <MenuDivider />
            </>
          )}

          {!loading && error && !needsConsent && (
            <>
              <MenuItem icon={<Warning20Regular />} disabled>
                Failed to load tenants
              </MenuItem>
              <MenuItem
                icon={<ArrowClockwise20Regular />}
                onClick={() => void fetchTenants(true)}
              >
                Retry
              </MenuItem>
              <MenuDivider />
            </>
          )}

          {!loading && !error && !needsConsent && tenants.length === 0 && (
            <MenuItem disabled>No tenants found</MenuItem>
          )}

          {tenants.map((tenant) => {
            const isActive = tenant.tenantId === activeTenantId;
            return (
              <MenuItem
                key={tenant.tenantId}
                icon={isActive ? <Checkmark20Regular /> : <Building20Regular />}
                onClick={() => void handleSwitch(tenant)}
                disabled={isActive}
              >
                <div className={styles.tenantItem}>
                  <strong>{tenant.displayName}</strong>
                  <span className={styles.tenantItemSub}>{tenant.defaultDomain}</span>
                </div>
              </MenuItem>
            );
          })}
        </MenuList>
      </MenuPopover>
    </Menu>
  );
}
