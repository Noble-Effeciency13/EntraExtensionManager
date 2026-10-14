# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning where practical.

## [1.1.0] - 2026-10-14

### Added

- **Bulk Update** support for Schema Extensions and Directory Extensions in write mode (Edit mode): apply typed values to one or multiple selected objects, or all objects matching applied conditions across one or multiple declared directory target types. Discovery follows every Graph page without a target cap.
- Value validation, refreshed confirmation with target count and applied conditions, progress, and per-object success/failure results. Successful writes persist; failures do not roll back previous writes.
- Adjacent **Assign Value to an Object** and **Bulk Assign/Update** actions for schema and directory extensions in Edit mode. Existing directory assignment and bulk menu entry points remain available.
- Single-object schema value assignment, with exactly one selected object and confirmation before writing.
- Combined AND filters for built-in Entra properties, direct group and administrative unit membership, and ExtensionAttribute1-15 on users and devices. Typed operators include Equals, Not Equals, Contains, Starts With, Ends With, Is Empty, and Is Not Empty where applicable.
- Explicit Apply/Clear controls, Graph-side narrowing for supported conditions, page-by-page evaluation for other conditions, cancellable discovery, and 50-row object/result tables for large target sets.
- Assignment-specific walkthrough and updated [Wizard guide](docs/assignment-wizard.md), screenshots, and reproducible demo examples.
- Updated About help, consistent single-assignment tooltips, and packaged user guides, walkthrough screenshots, changelog, and release notes for self-hosted deployments.

### Fixed

- Combined schema extension text search and owner app filtering into one search bar. Partial text searches loaded IDs, names/descriptions, target types, and owners; a complete owner app GUID retains server-side filtering alongside the status filter.
- Single-object and bulk assignment tour steps now highlight their respective buttons individually on both extension pages, rather than sharing the entire action group.
- Contextual walkthroughs now begin with the introduction, navigation, and access mode before page-specific tasks. The Directory Extensions tour no longer introduces itself at step 4 of 10; single and bulk assignment steps remain consecutive.

### Compatibility

- Applied property filters narrow the write target set, including all-objects operations. The existing quick object search remains display-only. Changing applied conditions clears object selections and requires a fresh confirmation.
- Existing definitions, single directory assignment, dry-runs, Open Extensions, authentication, and permission scopes remain unchanged. Membership reads are subject to Graph authorization; hidden memberships may require permissions the app does not request.
- Non-breaking minor release from v1.0.0. No data migration, runtime configuration changes, or additional permission scopes are required. Mailbox-bound schema targets (Contact, Event, Message, Post) remain explicitly flagged and excluded. Unrelated application functionality is unchanged. See the [Bulk Update guide](docs/bulk-update.md) for scope, operators, and performance considerations.

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
- **Portal skins** — five selectable themes (Fluent, Retro, 8-bit, Synthwave, Newsprint), each with light and dark variants, chosen from the top bar and remembered across sessions.
- **Demo mode** — a one-click "Explore the live demo" on the landing page renders the full portal against a fully simulated, in-memory tenant (sample schema, directory, and open extensions plus usage and audit data). All reads and writes are served offline; nothing is sent to Microsoft Graph. Includes "Reset demo data" and a one-way "Sign in to a real tenant".
- **Guided tours / coach marks** — a spotlight walkthrough available from a Help (`?`) button on every page (live and demo), with per-page steps and a focus-trapped, accessible callout. Auto-runs once when entering the demo.
- **Command palette** (`Ctrl`/`⌘`+`K`) — search to navigate, switch skin/theme/mode, start a tour, or run demo actions; in-app keyboard shortcuts (`/`, `n`, `e`, `?`) documented in the About dialog.
- **Manifest snippet** generates Microsoft Graph **JSON**, **PowerShell**, **app manifest**, and raw **HTTP** request snippets for each definition.
- **Usage monitor** flags **deprecated definitions that still hold values** so they can be migrated before removal.
- A global **error boundary** with a friendly recovery screen, and **route-level code splitting** so pages load on demand.
- Security hardening: centralized OData `$filter` quote-escaping and CSV formula-injection protection on exports.
- Quality tooling: Vitest unit tests, a Playwright demo smoke suite (`npm run test:e2e`), accessibility linting (`eslint-plugin-jsx-a11y`), and a `format:check` script.
