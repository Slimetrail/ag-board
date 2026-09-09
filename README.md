# Ag See a Need Fill a Need

South Carolina farm board. Built with Grok.

Look without an account. Sign in with email and password to post or request a connection. The same browser stays signed in until you log out (persistent Better Auth session cookie — not device fingerprinting).

## Deploy

This project is set up for Vercel. Connect the GitHub repo in Vercel and deploy from `main`.

### Sign-in (email + password)

Production login / signup is email and password only. Google and X buttons are not shown and are not invoked.

Sessions use Better Auth `rememberMe` plus a long sliding cookie (`expiresIn` 1 year, `updateAge` 1 day). Log out still calls `signOut()` and clears the HttpOnly session cookie.

The Grok auth broker `genericOAuth` plugin (Google / X) remains registered on the server for live-preview and other deploy paths, but production UX does not use it. You do not need `GROK_AUTH_CLIENT_*` for email login.

For email auth on Vercel, set:

- `BETTER_AUTH_SECRET` — long random string, stable across serverless instances
- `BETTER_AUTH_URL` — `https://ag-board-jet.vercel.app` (trusted-origin fallback also covers the Vercel production host if this is unset)

### Photo uploads (Vercel Blob)

Production (and any Preview that accepts uploads) needs `BLOB_READ_WRITE_TOKEN`.

Create a Blob store in the Vercel dashboard and attach it to this project so Vercel sets that token. Do not commit the token. Without it, uploads fail with a clear “photo storage is not configured” error instead of writing to disk (`public/uploads` does not work on Vercel serverless).

### Interest emails (Resend)

When a neighbor marks Interested, the listing owner is emailed at their **account** email (the Better Auth `user.email`, not a public profile field). The app uses the existing Resend HTTP API if these env vars are set:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (or `EMAIL_FROM`) — a verified Resend from-address

Do not commit those values. If they are unset, Interested still works; the owner is not emailed. The email names only the requester’s public username and profile link.
