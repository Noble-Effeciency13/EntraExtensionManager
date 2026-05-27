/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AAD_CLIENT_ID: string;
  readonly VITE_AAD_TENANT_ID: string;
  readonly VITE_AAD_REDIRECT_URI: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface EntraExtensionsManagerRuntimeConfig {
  /** Entra app registration application/client ID. */
  aadClientId?: string;
  /** Tenant authority segment: organizations, common, or a tenant ID. */
  aadTenantId?: string;
  /** Exact SPA redirect URI. Defaults to window.location.origin when omitted. */
  aadRedirectUri?: string;
}

interface Window {
  __EEM_CONFIG__?: EntraExtensionsManagerRuntimeConfig;
}
