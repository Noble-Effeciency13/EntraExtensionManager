import { useEffect, useState } from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  Toaster,
} from '@fluentui/react-components';
import { AuthGate } from '@/auth/AuthGate';
import { AppShell } from '@/components/AppShell';
import { AppRoutes } from '@/router';
import { TOASTER_ID } from '@/components/toast';

type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'eem.theme';

export function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <FluentProvider theme={theme === 'dark' ? webDarkTheme : webLightTheme}>
      <AuthGate>
        <AppShell theme={theme} onToggleTheme={toggleTheme}>
          <AppRoutes />
        </AppShell>
      </AuthGate>
      <Toaster toasterId={TOASTER_ID} position="top-end" />
    </FluentProvider>
  );
}
