/**
 * Durable Better Auth session — stay signed in on this browser until Log out.
 *
 * Cookie-based only (HttpOnly `__Host-` session token). No device fingerprinting
 * or hardware IDs. `rememberMe: true` on email sign-in sets a persistent cookie
 * whose `maxAge` matches `expiresIn`. Visiting the site after `updateAge`
 * slides the expiry forward so a phone that comes back stays signed in.
 *
 * `cookieCache.maxAge` is a short session-*data* cache (flicker prevention),
 * not the login lifetime.
 */

const DAY = 60 * 60 * 24;

/** Session token + cookie lifetime (1 year). */
export const SESSION_EXPIRES_IN = DAY * 365;

/** Refresh DB expiry + cookie maxAge when the session is used (1 day). */
export const SESSION_UPDATE_AGE = DAY;

/** Signed `session_data` cache TTL — keep short; not the session itself. */
export const SESSION_COOKIE_CACHE_MAX_AGE = 5 * 60;

export const betterAuthSession = {
  expiresIn: SESSION_EXPIRES_IN,
  updateAge: SESSION_UPDATE_AGE,
  cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE_MAX_AGE },
} as const;
