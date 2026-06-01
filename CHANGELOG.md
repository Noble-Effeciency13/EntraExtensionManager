# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where practical.

## [1.0.0] - 2026-06-01

### Added

- Initial React, TypeScript, Vite, MSAL, Fluent UI, and Microsoft Graph implementation.
- Schema extension and directory extension management features.
- Tools for manifest snippets, validation, usage monitoring, and audit log exploration.
- GitHub contribution guide, issue templates, pull request template, CI workflow, and Azure Static Web Apps deployment workflow.
- Azure Static Web Apps routing/security configuration for static SPA hosting.
- Browser-only authentication and data-handling model — no backend service receives or stores tenant data.
- Graph query configuration for direct fetch-on-access behaviour with no stale client-side cache.
- **Tenant switcher** in the top navigation bar. The signed-in user's Azure AD tenant memberships are fetched automatically via the Azure Management API on sign-in. Switching to a previously visited tenant is instant; switching to a new tenant triggers a Microsoft Entra consent popup for the app in that tenant. The active tenant drives all Microsoft Graph API calls, so the full extension management experience works across tenants without re-signing in.
- Multi-tenant MSAL configuration: the app authenticates against the `organizations` endpoint rather than a hardcoded tenant, allowing users from any Azure AD tenant to sign in.
- Per-request tenant-scoped token acquisition: all Microsoft Graph and edit-mode token requests are explicitly scoped to the active account's tenant, eliminating cross-tenant token mismatches.
- Content Security Policy permitting `connect-src` requests to `https://management.azure.com` for tenant enumeration.
