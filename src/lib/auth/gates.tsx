import { useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authEnabled, signOut } from "./client";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * With auth on, visitors are signed out until they authenticate — in the sandbox
 * live preview too, which does real sign-in. The shared dev user appears only
 * when auth is disabled (`VITE_AUTH_ENABLED=false`, the shipped default).
 * While the session is still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. Create this route. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present (real session, or the disabled-auth dev user). */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload). A hard navigation re-bootstraps the SPA and re-runs
 * session loading, which feels like a second "Loading…" on /login.
 *
 * Guard routes by waiting out `isPending` first (see `use-current-user`), then
 * render this.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/**
 * Signed-in identity + Log out. Uses the same `signOut()` as email sessions.
 * `layout="menu"` is the full-width hamburger control; the top bar stays compact.
 * Log out is only shown when auth is enabled (the disabled-auth dev user has
 * nothing to sign out of).
 */
export function UserButton({
  layout = "bar",
}: {
  layout?: "bar" | "menu";
}) {
  const user = useCurrentUser();
  // Log out can take a moment (and can fail when deployed), so the control
  // shows it is working and cannot be fired twice.
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "Account";
  const avatar = user.profileImageUrl ? (
    <img
      src={user.profileImageUrl}
      alt=""
      className="h-8 w-8 rounded-full object-cover"
    />
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
      {label.charAt(0).toUpperCase()}
    </span>
  );
  const logout = authEnabled ? (
    <Button
      type="button"
      variant="outline"
      size={layout === "menu" ? "lg" : "sm"}
      className={layout === "menu" ? "w-full" : undefined}
      disabled={signingOut}
      onClick={() => {
        setSigningOut(true);
        // Success navigates away; on failure re-enable so it can be retried.
        void signOut().catch(() => setSigningOut(false));
      }}
    >
      {signingOut ? "Logging out…" : "Log out"}
    </Button>
  ) : null;

  if (layout === "menu") {
    return (
      <div className="mt-2 flex flex-col gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2 px-1">
          {avatar}
          <span className="text-sm font-medium">{label}</span>
        </div>
        {logout}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {avatar}
      <span className="max-w-28 truncate text-sm font-medium">{label}</span>
      {logout}
    </div>
  );
}
