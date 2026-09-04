/**
 * Better Auth origin / baseURL helpers (pure — safe to unit-test).
 *
 * Credentialed POSTs (email sign-up / sign-in) are rejected with FORBIDDEN
 * `Invalid origin` / `INVALID_ORIGIN` unless the request Origin is listed in
 * `trustedOrigins`. Production on Vercel may have `BETTER_AUTH_URL` unset, so
 * this module always unions Vercel system hosts and a known public alias.
 */
import { PREVIEW_ALLOWED_HOSTS } from "./preview";

/** Local `npm run dev` (port 8080 contract). */
export const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

/**
 * Known public production host for this app. Used when Vercel system env vars
 * are missing (they can be disabled per-project) so sign-up still works at
 * the live alias. No trailing slash — Better Auth matches Origin exactly.
 */
export const PUBLIC_PRODUCTION_ORIGIN = "https://ag-board-jet.vercel.app";

export type AuthOriginEnv = {
  betterAuthUrl?: string;
  vercelProjectProductionUrl?: string;
  vercelUrl?: string;
  vercelEnv?: string;
  previewAllowedHosts?: readonly string[];
};

export type DynamicAuthBaseURL = {
  allowedHosts: string[];
  protocol: "auto";
  fallback: string;
};

/** Turn a host or URL into `https://origin` (or keep http(s) if already present). */
export function toHttpsOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withoutSlash = trimmed.replace(/\/+$/, "");
  const withProtocol = /^https?:\/\//i.test(withoutSlash)
    ? withoutSlash
    : `https://${withoutSlash}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    return undefined;
  }
}

function uniqueOrigins(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

/**
 * Origins Better Auth accepts on credentialed POSTs.
 *
 * Keeps the existing branches:
 *   - `BETTER_AUTH_URL` set → that URL + local loopback
 *   - otherwise → preview host wildcards + local loopback
 * and always unions Vercel production / deployment hosts plus the known alias.
 */
export function resolveTrustedOrigins(env: AuthOriginEnv = {}): string[] {
  const previewAllowedHosts = env.previewAllowedHosts ?? PREVIEW_ALLOWED_HOSTS;
  const existing = env.betterAuthUrl
    ? [env.betterAuthUrl, ...LOCAL_DEV_ORIGINS]
    : [
        ...previewAllowedHosts,
        ...previewAllowedHosts.flatMap((host) => [
          `https://${host}`,
          `http://${host}`,
        ]),
        ...LOCAL_DEV_ORIGINS,
      ];

  return uniqueOrigins([
    ...existing,
    toHttpsOrigin(env.vercelProjectProductionUrl),
    toHttpsOrigin(env.vercelUrl),
    PUBLIC_PRODUCTION_ORIGIN,
  ]);
}

/**
 * Better Auth `baseURL`. Prefer an explicit `BETTER_AUTH_URL`. On Vercel
 * production only, fall back to the public production URL so redirects stay
 * on the canonical host. Preview / local keep the dynamic allowlist so
 * `*.grok-sandbox.com` and loopback still resolve per-request.
 */
export function resolveAuthBaseURL(
  env: AuthOriginEnv = {},
): string | DynamicAuthBaseURL {
  if (env.betterAuthUrl) return env.betterAuthUrl;

  const previewAllowedHosts = [
    ...(env.previewAllowedHosts ?? PREVIEW_ALLOWED_HOSTS),
  ];

  if (env.vercelEnv === "production") {
    return (
      toHttpsOrigin(env.vercelProjectProductionUrl) ?? PUBLIC_PRODUCTION_ORIGIN
    );
  }

  return {
    allowedHosts: [...previewAllowedHosts, "localhost", "127.0.0.1", "[::1]"],
    protocol: "auto",
    fallback: "http://localhost:8080",
  };
}
