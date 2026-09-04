import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Toaster } from "sonner";
import { BoardGround, GroundPicker } from "@/components/board-ground";
import { InviteBadge } from "@/components/invite-badge";
import { OfficeNav } from "@/components/office-nav";
import { ProfileEnsure } from "@/components/profile-ensure";
import { Wordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useBoardStore } from "@/lib/board-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/market", label: "The board" },
  { to: "/share", label: "Share" },
  { to: "/needs", label: "Needs" },
  { to: "/leases", label: "Leases" },
  { to: "/skills", label: "Skills" },
  { to: "/learn", label: "Learn" },
  { to: "/about", label: "About" },
  { to: "/improve", label: "Improve" },
  { to: "/saved", label: "Pinned" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pinned = useBoardStore((s) => s.savedIds.length);
  const { user, isPending } = useCurrentUserState();

  if (pathname === "/login" || pathname === "/agree" || pathname === "/office") {
    return (
      <>
        <BoardGround />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            className:
              "!bg-surface !text-fg !border-border !shadow-[var(--shadow-card)]",
          }}
        />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <BoardGround />
      {user ? <ProfileEnsure /> : null}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="min-w-0" onClick={() => setOpen(false)}>
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                  pathname === item.to || pathname.startsWith(`${item.to}/`)
                    ? "bg-wash text-fg"
                    : "text-muted hover:bg-wash hover:text-fg",
                )}
              >
                {item.label}
                {item.to === "/saved" && pinned > 0 ? (
                  <span className="ml-1.5 tabular-nums text-subtle">{pinned}</span>
                ) : null}
              </Link>
            ))}
            <Button asChild className="ml-2">
              <Link to="/post">Post a listing</Link>
            </Button>
            <OfficeNav pathname={pathname} />
            {user ? (
              <>
                <InviteBadge className="ml-1" />
                <Link
                  to="/messages"
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/messages"
                      ? "bg-wash text-fg"
                      : "text-muted hover:bg-wash hover:text-fg",
                  )}
                >
                  Messages
                </Link>
                <Link
                  to="/profile"
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium",
                    pathname === "/profile"
                      ? "bg-wash text-fg"
                      : "text-muted hover:bg-wash hover:text-fg",
                  )}
                >
                  Profile
                </Link>
                <div className="ml-1">
                  <UserButton />
                </div>
              </>
            ) : isPending ? (
              <div className="ml-2 h-8 w-24 animate-pulse rounded-md bg-wash" />
            ) : (
              <Button asChild variant="outline" className="ml-2">
                <Link to="/login">Sign in</Link>
              </Button>
            )}
          </nav>

          <button
            type="button"
            className="relative flex size-11 items-center justify-center rounded-md text-fg lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open ? (
          <div className="border-t border-border bg-bg px-4 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-fg hover:bg-wash"
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-2">
                <Link to="/post" onClick={() => setOpen(false)}>
                  Post a listing
                </Link>
              </Button>
              <OfficeNav
                pathname={pathname}
                className="px-3 py-3 text-base"
                onClick={() => setOpen(false)}
              />
              {user ? (
                <>
                  <InviteBadge className="px-3 py-3 text-base" onClick={() => setOpen(false)} />
                  <Link
                    to="/messages"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-fg hover:bg-wash"
                  >
                    Messages
                  </Link>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-fg hover:bg-wash"
                  >
                    Profile
                  </Link>
                  <div className="mt-3 px-1">
                    <UserButton />
                  </div>
                </>
              ) : (
                <Button asChild variant="outline" className="mt-2">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    Sign in to post
                  </Link>
                </Button>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-wash/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Wordmark compact />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Ag See a Need Fill a Need — South Carolina, county by county.
              Free to use. No dues, no cut, no account fee.
            </p>
            <Link
              to="/about"
              className="mt-3 inline-block text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              About us
            </Link>
            <GroundPicker className="mt-6" />
          </div>
          <p className="text-xs text-subtle">
            The board is not a party to any trade. Look freely. Sign in to post
            or request a connection. Built with Grok.
          </p>
        </div>
      </footer>
      <Toaster
        position="bottom-right"
        toastOptions={{
          className:
            "!bg-surface !text-fg !border-border !shadow-[var(--shadow-card)]",
        }}
      />
    </div>
  );
}
