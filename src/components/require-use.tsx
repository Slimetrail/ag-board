import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ensureOwnProfile } from "@/lib/profiles";

export function RequireUse({
  children,
  reason,
}: {
  children: ReactNode;
  reason: string;
}) {
  const { user, isPending } = useCurrentUserState();
  const [terms, setTerms] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    void ensureOwnProfile()
      .then((profile) => setTerms(profile.termsAccepted))
      .catch(() => setTerms(false));
  }, [user]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-4xl">Sign in first</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{reason}</p>
        <p className="mt-2 text-sm text-muted">
          You can keep looking without an account.
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Sign in or create an account</Link>
        </Button>
      </div>
    );
  }

  if (terms === false) {
    return <RedirectToSignIn to="/agree" />;
  }

  if (terms === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening…
      </div>
    );
  }

  return <>{children}</>;
}
