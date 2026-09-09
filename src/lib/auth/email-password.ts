/**
 * Local email/password — the production sign-in / sign-up path.
 *
 * Forms use `authClient.signUp.email` / `authClient.signIn.email` from
 * `@/lib/auth/client`. Session lifetime lives in `./session` (imported by
 * `server.ts`). Broker Google / X stays unused by the login UI.
 */
export const emailAndPasswordEnabled = true;
