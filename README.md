# Ag See a Need Fill a Need

South Carolina farm board. Built with Grok.

Look without an account. Sign in to post or request a connection.

## Deploy

This project is set up for Vercel. Connect the GitHub repo in Vercel and deploy from `main`.

### Photo uploads (Vercel Blob)

Production (and any Preview that accepts uploads) needs `BLOB_READ_WRITE_TOKEN`.

Create a Blob store in the Vercel dashboard and attach it to this project so Vercel sets that token. Do not commit the token. Without it, uploads fail with a clear “photo storage is not configured” error instead of writing to disk (`public/uploads` does not work on Vercel serverless).

### Interest emails (Resend)

When a neighbor marks Interested, the listing owner is emailed at their **account** email (the Better Auth `user.email`, not a public profile field). The app uses the existing Resend HTTP API if these env vars are set:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (or `EMAIL_FROM`) — a verified Resend from-address

Do not commit those values. If they are unset, Interested still works; the owner is not emailed. The email names only the requester’s public username and profile link.
