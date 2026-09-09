/**
 * Human copy for leftover Better Auth OAuth callback `?error=` codes.
 *
 * Production login is email-only. The broker plugin may still redirect here
 * from unused Google / X callbacks (old bookmarks, other deploy paths).
 * Never show the raw machine code.
 */

const EMAIL_FALLBACK = "That sign-in did not finish. Use email and password below.";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  name_is_missing: EMAIL_FALLBACK,
  email_is_missing: EMAIL_FALLBACK,
  id_is_missing: EMAIL_FALLBACK,
  user_info_is_missing: EMAIL_FALLBACK,
  oauth_code_verification_failed: EMAIL_FALLBACK,
  oAuth_code_missing: EMAIL_FALLBACK,
  oauth_code_missing: EMAIL_FALLBACK,
  state_mismatch: "That sign-in expired or was interrupted. Use email and password below.",
  invalid_state: "That sign-in expired or was interrupted. Use email and password below.",
  issuer_missing: EMAIL_FALLBACK,
  issuer_mismatch: EMAIL_FALLBACK,
  account_not_linked:
    "That account is not linked to this login. Use email and password below.",
  unable_to_link_account: EMAIL_FALLBACK,
  account_already_linked_to_different_user:
    "That account is already used on another login. Use email and password below.",
  "email_doesn't_match":
    "That email does not match the account you are linking. Use email and password below.",
  access_denied: "Sign-in was cancelled. Use email and password below.",
  invalid_request: EMAIL_FALLBACK,
  invalid_client: "Social sign-in is not used on this site. Use email and password below.",
  unauthorized_client:
    "Social sign-in is not used on this site. Use email and password below.",
  PROVIDER_CONFIG_NOT_FOUND:
    "Social sign-in is not used on this site. Use email and password below.",
  INVALID_OAUTH_CONFIGURATION:
    "Social sign-in is not used on this site. Use email and password below.",
  INVALID_OAUTH_CONFIG:
    "Social sign-in is not used on this site. Use email and password below.",
};

/** True when a string looks like a Better Auth / OAuth machine code. */
export function isOAuthErrorCode(value: string): boolean {
  return /^[A-Za-z][A-Za-z0-9._'-]{1,119}$/.test(value.trim());
}

/** Safe subset of `?error=` we will keep on `/login`. */
export function parseOAuthErrorCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed || !isOAuthErrorCode(trimmed)) return undefined;
  return trimmed;
}

/**
 * User-facing copy for an OAuth callback or client error.
 * Known codes are humanized. Unknown machine codes get a generic sentence
 * (never the raw code). Ordinary error sentences return null so the caller
 * can keep them.
 */
export function oauthErrorMessage(code: string | undefined | null): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const mapped =
    OAUTH_ERROR_MESSAGES[trimmed] ?? OAUTH_ERROR_MESSAGES[trimmed.toLowerCase()];
  if (mapped) return mapped;
  if (isOAuthErrorCode(trimmed)) {
    return EMAIL_FALLBACK;
  }
  return null;
}
