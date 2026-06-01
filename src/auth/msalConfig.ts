import {
  Configuration,
  LogLevel,
  BrowserCacheLocation,
} from '@azure/msal-browser';

function usableRuntimeValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('__') && trimmed.endsWith('__')) return undefined;
  return trimmed;
}

const runtimeConfig = window.__EEM_CONFIG__;
const runtimeClientId = usableRuntimeValue(runtimeConfig?.aadClientId);
const useRuntimeConfig = Boolean(runtimeClientId);

const clientId = runtimeClientId ?? import.meta.env.VITE_AAD_CLIENT_ID ?? '';
const redirectUri = useRuntimeConfig
  ? usableRuntimeValue(runtimeConfig?.aadRedirectUri) || window.location.origin
  : import.meta.env.VITE_AAD_REDIRECT_URI || window.location.origin;

/**
 * Builds a tenant-specific authority URL for per-request token acquisition.
 * Used in token requests after sign-in to scope tokens to the correct tenant.
 */
export function buildTenantAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}`;
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    // Always use the multi-tenant 'organizations' endpoint so users from any
    // Azure AD tenant can sign in. Tenant-specific token acquisition happens
    // at request time via buildTenantAuthority().
    authority: 'https://login.microsoftonline.com/organizations',
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      piiLoggingEnabled: false,
      loggerCallback: (level, message) => {
        if (level === LogLevel.Error) console.error(message);
        else if (level === LogLevel.Warning) console.warn(message);
      },
    },
  },
};

/** Delegated scopes used in Read mode (no write access to the directory). */
export const readScopes = [
  'User.Read',
  'Application.Read.All',
  'Directory.Read.All',
  'AuditLog.Read.All',
];

/** Delegated scopes used in Edit mode (full read/write of extensions). */
export const editScopes = [
  'User.Read',
  'Application.ReadWrite.All',
  'Directory.ReadWrite.All',
  'AuditLog.Read.All',
];

/** Initial login asks only for read consent. Edit consent is incremental. */
export const loginRequest = {
  scopes: readScopes,
};
