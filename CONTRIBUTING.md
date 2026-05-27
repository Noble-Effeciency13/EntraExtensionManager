# Contributing

Thanks for helping improve Entra Extensions Manager.

## Development setup

1. Install Node.js 20+.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and fill in your Entra app registration values.
4. Start the app with `npm run dev`.

## Required checks

Before opening or updating a pull request, run:

```powershell
npm run lint
npm run test
npm run build
```

## Pull request expectations

- Keep changes focused and easy to review.
- Update `README.md` when setup, deployment, auth, permissions, or data-handling behavior changes.
- Update `CHANGELOG.md` for user-facing changes.
- Include screenshots or short recordings for visible UI changes.
- Surface Microsoft Graph `request-id` values in errors where possible.

## Privacy and data-handling rules

This project must remain browser-only unless a future design explicitly changes that.

Do not add:

- A custom backend API.
- Azure Functions endpoints.
- A database or storage account for tenant data.
- Server-side token handling.
- Client secrets.
- Application permissions.
- Persistent caching of Microsoft Graph tenant/user/client/extension data.

Browser storage should remain limited to MSAL session state and simple UI preferences.

## Reporting issues safely

When filing issues or PRs, do not include:

- Access tokens or refresh tokens.
- Client secrets.
- Unsanitized tenant IDs, user IDs, object IDs, or app IDs unless you are comfortable sharing them.
- Full audit log exports containing personal or tenant-sensitive data.

Helpful diagnostic information includes sanitized Graph error messages, request IDs, timestamps, browser name/version, and the operation that failed.