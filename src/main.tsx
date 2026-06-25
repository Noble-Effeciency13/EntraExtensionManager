import React from 'react';
import ReactDOM from 'react-dom/client';
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { msalConfig } from '@/auth/msalConfig';
import { ModeProvider } from '@/auth/mode';
import { App } from '@/App';
import '@/global-overrides.css';
import '@/skins.css';

const msalInstance = new PublicClientApplication(msalConfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      gcTime: 0,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  },
});

async function bootstrap() {
  await msalInstance.initialize();

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0]);
  }

  msalInstance.addEventCallback((event) => {
    if (
      (event.eventType === EventType.LOGIN_SUCCESS ||
        event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) &&
      event.payload &&
      'account' in event.payload &&
      event.payload.account
    ) {
      msalInstance.setActiveAccount(event.payload.account);
    }
    // When the browser returns from an edit-mode acquireTokenRedirect, restore
    // the pending mode so the user lands back in edit mode automatically.
    if (
      event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS &&
      sessionStorage.getItem('eem.pendingMode') === 'edit'
    ) {
      sessionStorage.removeItem('eem.pendingMode');
      localStorage.setItem('eem.mode', 'edit');
    }
  });

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <ModeProvider>
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </QueryClientProvider>
        </ModeProvider>
      </MsalProvider>
    </React.StrictMode>,
  );
}

void bootstrap();
