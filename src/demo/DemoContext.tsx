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
    setIsDemo(true);
  }, []);

  const exitDemo = useCallback(() => {
    sessionStorage.removeItem(DEMO_KEY);
    setIsDemo(false);
    // Full reload returns to a clean signed-out state and clears query caches.
    window.location.reload();
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({ isDemo, enterDemo, exitDemo }),
    [isDemo, enterDemo, exitDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within a DemoProvider.');
  return ctx;
}
