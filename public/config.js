// Runtime configuration for self-hosted deployments.
//
// Downloaded release assets can be self-hosted without rebuilding the app:
// edit this file after extracting the release ZIP and before publishing the
// files to your static web host.
//
// If aadClientId is left as the placeholder value, the app falls back to the
// build-time VITE_AAD_* values used by the hosted managed service.
window.__EEM_CONFIG__ = {
  aadClientId: '__VITE_AAD_CLIENT_ID__',
  aadTenantId: '__VITE_AAD_TENANT_ID__',
  aadRedirectUri: '__VITE_AAD_REDIRECT_URI__',

  // Optional, privacy-first usage analytics. Leave `analytics.src` empty to
  // collect nothing (the default — self-hosted deployments stay untracked).
  //
  // When `analytics.src` points at a cookieless, privacy-respecting provider
  // (e.g. Plausible, Fathom, Cloudflare Web Analytics, GoatCounter) the app
  // loads that one page-load beacon: no cookies, no personal data, and no
  // per-action tracking. You must also allow the provider's domain in the
  // Content-Security-Policy in index.html.
  analytics: {
    src: '',
    // Extra <script> attributes the provider needs, for example:
    //   { 'data-domain': 'extensions.contoso.com' }  // Plausible
    attributes: {},
  },
};