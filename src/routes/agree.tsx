import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wordmark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { safeReturnTo } from "@/lib/auth/return-to";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  DISCLAIMER_BODY,
  DISCLAIMER_CHECK,
  DISCLAIMER_TITLE,
} from "@/lib/disclaimer";
import { acceptTerms, ensureOwnProfile } from "@/lib/profiles";

export type AgreeSearch = {
  next?: string;
};

export const Route = createFileRoute("/agree")({
  validateSearch: (search: Record<string, unknown>): AgreeSearch => {
    const next = safeReturnTo(search.next);
    return next ? { next } : {};
  },
  component: AgreePage,
});

function AgreePage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const { user, isPending } = useCurrentUserState();
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void ensureOwnProfile()
      .then((profile) => {
        if (profile.termsAccepted) {
          void navigate({ to: (next ?? "/") as "/" });
        }
      })
      .catch(() => undefined);
  }, [user, navigate, next]);

  if (isPending) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg">
        <p className="text-sm text-muted">Opening the terms…</p>
      </main>
    );
  }
  if (!user) {
    return (
      <main className="grid min-h-dvh place-items-center bg-bg px-4">
        <div className="max-w-md rounded-xl bg-surface p-6 text-center shadow-[var(--shadow-card)]">
          <p className="font-display text-2xl">Sign-in didn't stick</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Try email and password on the next screen. If you used Google or X,
            allow pop-ups and try once more.
          </p>
          <Button asChild className="mt-6">
            <a href="/login">Back to sign in</a>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <img
        src="/images/hero.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_70%]"
      />
      <div className="absolute inset-0 bg-fg/55" />
      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-12">
        <div className="rounded-xl bg-bg/95 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <Wordmark />
          <p className="mt-6 text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
            Before you use the board
          </p>
          <h1 className="mt-2 font-display text-3xl">{DISCLAIMER_TITLE}</h1>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {DISCLAIMER_BODY}
          </p>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={agreed}
              onChange={(event) => setAgreed(event.target.checked)}
            />
            <span>{DISCLAIMER_CHECK}</span>
          </label>
          {error ? (
            <p className="mt-3 text-sm text-fg" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            className="mt-6 w-full"
            disabled={!agreed || pending}
            onClick={() => {
              setPending(true);
              setError(null);
              void ensureOwnProfile()
                .then(() => acceptTerms())
                .then(() => navigate({ to: (next ?? "/") as "/" }))
                .catch((err: unknown) => {
                  setError(
                    err instanceof Error ? err.message : "Could not save your agreement.",
                  );
                  setPending(false);
                });
            }}
          >
            {pending ? "Saving…" : "I agree — continue"}
          </Button>
          <p className="mt-4 text-center text-xs text-subtle">
            You can still look around the board. Posting and connection
            requests stay locked until you check this box.
          </p>
        </div>
      </div>
    </main>
  );
}
