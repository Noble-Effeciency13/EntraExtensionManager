import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMsal } from '@azure/msal-react';
import { buildTenantAuthority, editScopes, readScopes } from './msalConfig';
import { useDemo } from '@/demo/DemoContext';

export type Mode = 'read' | 'edit';

const MODE_KEY = 'eem.mode';

interface ModeContextValue {
  mode: Mode;
  isEdit: boolean;
  scopes: string[];
  /**
   * Switch the active mode. When switching to `edit`, this triggers an
   * incremental MSAL consent prompt for the read/write Graph scopes. The
   * promise resolves to `true` on success and `false` if the user cancels
   * consent or no account is signed in.
   */
  setMode: (next: Mode) => Promise<boolean>;
  /** True while an `edit` consent redirect is in flight. */
  switching: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
  const { isDemo } = useDemo();
  const [mode, setModeState] = useState<Mode>(() => {
    const stored = localStorage.getItem(MODE_KEY);
    return stored === 'edit' ? 'edit' : 'read';
  });
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const setMode = useCallback<ModeContextValue['setMode']>(
    async (next) => {
      if (next === mode) return true;
      // In the demo, edit mode is granted instantly with no consent redirect.
      if (isDemo) {
        setModeState(next);
        return true;
      }
      if (next === 'edit') {
        const account = instance.getActiveAccount() ?? accounts[0];
        if (!account) return false;
        setSwitching(true);
        try {
          // Persist intent before redirecting so the event callback in main.tsx
          // can restore edit mode when the browser returns from the redirect.
          sessionStorage.setItem('eem.pendingMode', 'edit');
          // Use `prompt: 'login'` so the user sees a visible sign-in step
          // (so they notice they're switching into edit mode) but the consent
          // screen is *not* re-shown on every toggle. Consent is only
          // re-presented by AAD when the requested scopes have not already
          // been granted to this app/user.
          await instance.acquireTokenRedirect({
            scopes: editScopes,
            account,
            prompt: 'login',
            authority: buildTenantAuthority(account.tenantId),
          });
          // Browser navigates away — code below is unreachable.
          return true;
        } catch (err) {
          sessionStorage.removeItem('eem.pendingMode');
          console.warn('Edit-mode redirect failed.', err);
          return false;
        } finally {
          setSwitching(false);
        }
      }
      setModeState('read');
      return true;
    },
    [mode, instance, accounts, isDemo],
  );

  const value = useMemo<ModeContextValue>(
    () => ({
      mode,
      isEdit: mode === 'edit',
      scopes: mode === 'edit' ? editScopes : readScopes,
      setMode,
      switching,
    }),
    [mode, setMode, switching],
  );

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>;
}

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used inside a ModeProvider.');
  return ctx;
}
