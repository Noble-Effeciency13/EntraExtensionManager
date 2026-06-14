# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where practical.

## [1.0.0] - 2026-06-22

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
- **Open extensions** management as a primary area alongside schema and directory extensions. Lists, creates, edits, and deletes `openTypeExtension` instances on Users, Groups, Devices, and the Organization object. Because open extensions are stored per-object rather than registered tenant-wide, the area is object-scoped: pick a resource type and an object to inspect or manage the open extensions held on it.
- **Directory object search** for the Open extensions area. A debounced type-ahead search (Microsoft Graph `$search` with `ConsistencyLevel: eventual`) resolves users, groups, and devices by name, UPN, or mail as you type, while still accepting a pasted object id or UPN via a direct-lookup option. The Organization object loads automatically as a singleton. Searching uses the existing `Directory.Read.All` permission — no additional consent is required.
- **Add-extension example data**: the Open extensions create dialog shows a clearly marked example JSON object as placeholder text, so the expected shape is obvious without pre-filling submittable values.
- **Usage monitor object drill-down**: expanding an extension in the Usage monitor lists the actual directory objects that hold a non-null value for that extension, together with the stored values, per supported target type. Values are masked by default with a reveal toggle and a personal-data warning, results page on demand (Load more), and the loaded rows can be exported to CSV or JSON.
- **Directory extensions** is now the default landing page after sign-in.
- Persistent application **footer** with a link to the source repository, the project tagline, and the author's social links (LinkedIn, GitHub, website), shown across the portal regardless of scroll position.
- Refreshed, modernized sign-in screen presenting the access model (read-by-default, delegated permissions, browser-only) before authentication.
