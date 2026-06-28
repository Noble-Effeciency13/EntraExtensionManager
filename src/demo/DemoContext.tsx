import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { resetDemoStore } from './demoData';

const DEMO_KEY = 'eem.demo';

interface DemoContextValue {
  /** True while the portal is showing the simulated environment. */
  isDemo: boolean;
  /** Enter demo mode: re-seed the fixture and flip the flag. */
  enterDemo: () => void;
  /** Leave demo mode and return to the sign-in screen. */
  exitDemo: () => void;
  /**
   * Drop the demo flag without reloading. Used right before kicking off a real
   * Entra sign-in redirect so the app returns to a clean authenticated session.
   */
  clearDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

/**
 * Tracks whether the portal is running against the simulated demo environment.
 * The flag lives in `sessionStorage` so it survives refreshes within the tab
 * but never leaks into a real signed-in session in another tab/window.
 */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [isDemo, setIsDemo] = useState(
    () => sessionStorage.getItem(DEMO_KEY) === '1',
  );

  const enterDemo = useCallback(() => {
    resetDemoStore();
    // Demo always starts in read mode for a predictable first impression.
    localStorage.setItem('eem.mode', 'read');
    sessionStorage.setItem(DEMO_KEY, '1');
    // Flag the walkthrough to auto-launch once the shell mounts.
    sessionStorage.setItem('eem.demo.tourPending', '1');
    setIsDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY);
    setIsDemo(false);
    // Full reload returns to a clean signed-out state and clears query caches.
    window.location.reload();
  }, []);

  const clearDemo = useCallback(() => {
    // Only drop the persisted flag — the caller immediately navigates away via a
    // sign-in redirect, so there's no need to flip React state (and doing so
    // would briefly flash the landing page).
    sessionStorage.removeItem(DEMO_KEY);
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({ isDemo, enterDemo, exitDemo, clearDemo }),
    [isDemo, enterDemo, exitDemo, clearDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within a DemoProvider.');
  return ctx;
}
