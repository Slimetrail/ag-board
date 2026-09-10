import { setCookie } from "@tanstack/react-start/server";
import { SESSION_TOKEN_COOKIE } from "./server";

/**
 * Expire Better Auth cookies on this response so a deleted account cannot keep
 * a `session_data` cache (5-minute TTL) that still looks signed in.
 *
 * `__Host-` cookies must be cleared with Secure + Path=/ and no Domain.
 */
const AUTH_COOKIES = [
  SESSION_TOKEN_COOKIE,
  "__Host-grok-auth.session_data",
  "__Host-grok-auth.account_data",
  "__Host-grok-auth.dont_remember",
] as const;

export function expireAuthCookies(): void {
  for (const name of AUTH_COOKIES) {
    setCookie(name, "", {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 0,
    });
  }
}
