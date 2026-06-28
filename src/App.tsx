import { useEffect, useState } from 'react';
import { FluentProvider, Toaster } from '@fluentui/react-components';
import { AuthGate } from '@/auth/AuthGate';
import { AppShell } from '@/components/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TourProvider } from '@/components/tour/TourProvider';
import { appChromeTour } from '@/components/tour/appTour';
import { AppRoutes } from '@/router';
import { TOASTER_ID } from '@/components/toast';
import {
  DEFAULT_SKIN,
  isSkinId,
  resolveTheme,
  type SkinId,
  type ThemeMode,
} from '@/theme/skins';

const THEME_KEY = 'eem.theme';
const SKIN_KEY = 'eem.skin';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [skin, setSkin] = useState<SkinId>(() => {
    const stored = localStorage.getItem(SKIN_KEY);
    return isSkinId(stored) ? stored : DEFAULT_SKIN;
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.body.dataset.themeMode = theme;
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(SKIN_KEY, skin);
    document.body.dataset.skin = skin;
  }, [skin]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <FluentProvider theme={resolveTheme(skin, theme)}>
      <ErrorBoundary>
        <TourProvider chromeSteps={appChromeTour}>
          <AuthGate>
            <AppShell
              theme={theme}
              onToggleTheme={toggleTheme}
              skin={skin}
              onSkinChange={setSkin}
            >
              <AppRoutes />
            </AppShell>
          </AuthGate>
        </TourProvider>
      </ErrorBoundary>
      <Toaster toasterId={TOASTER_ID} position="top-end" />
    </FluentProvider>
  );
}
