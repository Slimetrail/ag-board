# Ag See a Need Fill a Need

South Carolina farm board. Built with Grok.

Look without an account. Sign in to post or request a connection.

## Deploy

This project is set up for Vercel. Connect the GitHub repo in Vercel and deploy from `main`.

### Social login (Google / X)

Email/password is local Better Auth. Google and X federate through the Grok auth broker (`https://auth.grok.me`). Production currently falls back to the shared preview client (`grok_preview`) when these are unset — that client is documented as preview-only (`*.grok-sandbox.com` callbacks).

For production social login to complete after the provider returns, set these on the Vercel project (Production). Do not commit the values. Generate your own secret; do not reuse a sample:

- `BETTER_AUTH_SECRET` — long random string, stable across serverless instances (OAuth state is signed with it)
- `BETTER_AUTH_URL` — `https://ag-board-jet.vercel.app`
- `GROK_AUTH_ISSUER` — `https://auth.grok.me` (optional; this is the default)
- `GROK_AUTH_CLIENT_ID` / `GROK_AUTH_CLIENT_SECRET` — a **per-app** broker client, not `grok_preview`

Register these redirect URIs on that broker client:

- `https://ag-board-jet.vercel.app/api/auth/oauth2/callback/grok-google`
- `https://ag-board-jet.vercel.app/api/auth/oauth2/callback/grok-x`

The Grok/xAI app deployer normally injects `GROK_AUTH_*`. A plain Vercel Git deploy does not.

### Photo uploads (Vercel Blob)

Production (and any Preview that accepts uploads) needs `BLOB_READ_WRITE_TOKEN`.

Create a Blob store in the Vercel dashboard and attach it to this project so Vercel sets that token. Do not commit the token. Without it, uploads fail with a clear “photo storage is not configured” error instead of writing to disk (`public/uploads` does not work on Vercel serverless).

### Interest emails (Resend)

When a neighbor marks Interested, the listing owner is emailed at their **account** email (the Better Auth `user.email`, not a public profile field). The app uses the existing Resend HTTP API if these env vars are set:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (or `EMAIL_FROM`) — a verified Resend from-address

Do not commit those values. If they are unset, Interested still works; the owner is not emailed. The email names only the requester’s public username and profile link.
