/**
 * Broker OAuth providers (Grok auth broker → Google / X).
 *
 * Still registered on the server `genericOAuth` plugin so other deploy paths
 * (live preview / Grok sandbox) keep working. Production login / signup UI
 * is email + password only and must not import or render these.
 *
 * Source of truth for the unused server plugin (`server.ts`) and the dormant
 * `signIn()` helper in `client.ts`. Kept in its own dependency-free module so
 * the client can import it without pulling the server-only Better Auth
 * instance (and `pg`) into the browser bundle.
 *
 * Each app federates to the shared **auth broker** (`GROK_AUTH_ISSUER`), which
 * holds the real Google/X secrets. The app never sees them — it only knows its
 * own per-app client id/secret and which upstream to ask the broker for (`idp`).
 */
export type GrokProvider = {
  /** This app's local provider id; also the callback path segment. */
  providerId: string;
  /** Upstream hint the broker forwards to (Better Auth social id). */
  idp: string;
  /** Human label for the sign-in button. */
  label: string;
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
  { providerId: "grok-x", idp: "twitter", label: "X" },
];
