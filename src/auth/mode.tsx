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
import { editScopes, readScopes } from './msalConfig';

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
  /** True while an `edit` consent popup is in flight. */
  switching: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

export function ModeProvider({ children }: { children: ReactNode }) {
  const { instance, accounts } = useMsal();
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
      if (next === 'edit') {
        const account = instance.getActiveAccount() ?? accounts[0];
        if (!account) return false;
        setSwitching(true);
        try {
          // Use `prompt: 'login'` so the user sees a visible sign-in step
          // (so they notice they're switching into edit mode) but the consent
          // screen is *not* re-shown on every toggle. Consent is only
          // re-presented by AAD when the requested scopes have not already
          // been granted to this app/user.
          await instance.acquireTokenPopup({
            scopes: editScopes,
            account,
            prompt: 'login',
          });
          setModeState('edit');
          return true;
        } catch (err) {
          console.warn('Edit-mode sign-in failed or was cancelled.', err);
          return false;
        } finally {
          setSwitching(false);
        }
      }
      setModeState('read');
      return true;
    },
    [mode, instance, accounts],
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
