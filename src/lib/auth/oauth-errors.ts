/**
 * Human copy for Better Auth OAuth callback `?error=` codes.
 *
 * Failed Google / X returns land on `errorCallbackURL` with a machine code
 * (`name_is_missing`, `oauth_code_verification_failed`, …). Showing the raw
 * code is what production users reported as "an error code" popping up.
 */

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  name_is_missing:
    "Google or X signed you in, but did not send a display name. Try again, or use email below.",
  email_is_missing:
    "Google or X signed you in, but did not send an email. Try again, or use email below.",
  id_is_missing:
    "Google or X signed you in, but did not send an account id. Try again, or use email below.",
  user_info_is_missing:
    "Google or X signed you in, but the account profile did not load. Try again, or use email below.",
  oauth_code_verification_failed:
    "Google or X came back, but this site could not finish the sign-in. Try again, or use email below.",
  oAuth_code_missing:
    "Google or X did not send a sign-in code back. Try again, or use email below.",
  oauth_code_missing:
    "Google or X did not send a sign-in code back. Try again, or use email below.",
  state_mismatch:
    "That sign-in expired or was interrupted. Try Google or X once more.",
  invalid_state:
    "That sign-in expired or was interrupted. Try Google or X once more.",
  issuer_missing:
    "The sign-in provider omitted its issuer. Try again, or use email below.",
  issuer_mismatch:
    "The sign-in provider did not match this site. Try again, or use email below.",
  account_not_linked:
    "That Google or X account is not linked to this login. Use email below, or try the same provider you used before.",
  unable_to_link_account:
    "Could not attach that Google or X account. Try again, or use email below.",
  account_already_linked_to_different_user:
    "That Google or X account is already used on another login.",
  "email_doesn't_match":
    "That Google or X email does not match the account you are linking.",
  access_denied: "Google or X was cancelled. You can try again, or use email below.",
  invalid_request:
    "Google or X rejected the sign-in request. Try again, or use email below.",
  invalid_client:
    "This site is not registered with the sign-in broker. Use email below until that is configured.",
  unauthorized_client:
    "This site is not allowed to use Google or X sign-in yet. Use email below.",
  PROVIDER_CONFIG_NOT_FOUND:
    "Google and X are not configured on this deployment. Use email below.",
  INVALID_OAUTH_CONFIGURATION:
    "Google and X are not configured on this deployment. Use email below.",
  INVALID_OAUTH_CONFIG:
    "Google and X are not configured on this deployment. Use email below.",
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
    return "Google or X didn't finish. Try again, or use email below.";
  }
  return null;
}
