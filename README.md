# Ag See a Need Fill a Need

South Carolina farm board. Built with Grok.

Look without an account. Sign in to post or request a connection.

## Deploy

This project is set up for Vercel. Connect the GitHub repo in Vercel and deploy from `main`.

### Photo uploads (Vercel Blob)

Production (and any Preview that accepts uploads) needs `BLOB_READ_WRITE_TOKEN`.

Create a Blob store in the Vercel dashboard and attach it to this project so Vercel sets that token. Do not commit the token. Without it, uploads fail with a clear “photo storage is not configured” error instead of writing to disk (`public/uploads` does not work on Vercel serverless).
