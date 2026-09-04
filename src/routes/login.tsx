import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Wordmark } from "@/components/brand-mark";
import { afterAuthPath, safeReturnTo } from "@/lib/auth/return-to";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  GROK_PROVIDERS,
  authClient,
  authEnabled,
  signIn,
} from "@/lib/auth/client";
import {
  DISCLAIMER_BODY,
  DISCLAIMER_CHECK,
} from "@/lib/disclaimer";
import { passwordChecks, passwordError } from "@/lib/password";
import { cn } from "@/lib/utils";

export type LoginSearch = {
  next?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    const next = safeReturnTo(search.next);
    return next ? { next } : {};
  },
  component: Login,
});

const BEARER_KEY = "grok-auth.bearer-token";

function keepSessionToken(token: string | null | undefined) {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

function Login() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const afterAuth = afterAuthPath(next);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const checks = passwordChecks(password);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!authEnabled) return;
    if (mode === "up") {
      const issue = passwordError(password);
      if (issue) {
        setError(issue);
        return;
      }
      if (password !== confirm) {
        setError("Those two passwords don't match.");
        return;
      }
      if (!agreed) {
        setError("Check the box — you take the risk on any trade or invite.");
        return;
      }
    }
    setPending(true);
    try {
      const fetchOptions = {
        onSuccess(ctx: { response: Response }) {
          keepSessionToken(ctx.response.headers.get("set-auth-token"));
        },
      };
      if (mode === "up") {
        const { data, error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0] || "Neighbor",
          fetchOptions,
        });
        if (signUpError) {
          throw new Error(signUpError.message || "Could not create the account.");
        }
        keepSessionToken(
          (data as { token?: string } | null)?.token,
        );
      } else {
        const { data, error: signInError } = await authClient.signIn.email({
          email,
          password,
          fetchOptions,
        });
        if (signInError) {
          throw new Error(signInError.message || "Email or password is off.");
        }
        keepSessionToken(
          (data as { token?: string } | null)?.token,
        );
      }
      try {
        await authClient.getSession();
      } catch {
        /* session store will pick it up */
      }
      await navigate({
        to: "/agree",
        search: next ? { next } : {},
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setPending(false);
    }
  }

  function onProvider(providerId: string) {
    setError(null);
    setPending(true);
    void signIn(providerId, { callbackURL: afterAuth })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "That sign-in didn't finish.";
        setError(
          /pop-up|cancelled|failed/i.test(message)
            ? "Google or X didn't finish. Allow pop-ups, or use email below."
            : message,
        );
      })
      .finally(() => setPending(false));
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      <img
        src="/images/hero.jpg"
        alt=""
        className="absolute inset-0 size-full object-cover object-[center_70%]"
      />
      <div className="absolute inset-0 bg-fg/55" />
      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-xl bg-bg/95 p-6 shadow-[var(--shadow-card)] sm:p-8">
          <Wordmark />
          <h1 className="mt-6 font-display text-3xl">
            {mode === "in" ? "Sign in to the board" : "Create a free account"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            South Carolina neighbors only. Free to use — no dues, no cut.
          </p>

          {authEnabled ? (
            <>
              <div className="mt-6 grid gap-2">
                {GROK_PROVIDERS.map((provider) => (
                  <Button
                    key={provider.providerId}
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => onProvider(provider.providerId)}
                  >
                    Continue with {provider.label}
                  </Button>
                ))}
              </div>
              <p className="mt-6 text-center text-xs tracking-wide text-subtle uppercase">
                Or with email
              </p>
              <form className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
                {mode === "up" ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Farm or place name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Cedar Hollow"
                      autoComplete="name"
                    />
                  </div>
                ) : null}
                <div className="grid gap-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@farm.sc"
                  />
                </div>
                <PasswordField
                  id="password"
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  visible={showPassword}
                  onToggle={() => setShowPassword((open) => !open)}
                  showLabel="Show password"
                  hideLabel="Hide password"
                />
                {mode === "up" ? (
                  <>
                    <PasswordField
                      id="confirm"
                      label="Confirm password"
                      value={confirm}
                      onChange={setConfirm}
                      autoComplete="new-password"
                      visible={showConfirm}
                      onToggle={() => setShowConfirm((open) => !open)}
                      showLabel="Show confirm password"
                      hideLabel="Hide confirm password"
                    />
                    <ul className="grid gap-1.5 text-sm">
                      {checks.map((item) => (
                        <li
                          key={item.id}
                          className={cn(
                            "flex items-center gap-2",
                            item.ok ? "text-fg" : "text-muted",
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              item.ok ? "bg-primary" : "bg-border",
                            )}
                          />
                          {item.label}
                        </li>
                      ))}
                    </ul>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                      {DISCLAIMER_BODY}
                    </p>
                    <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 accent-primary"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        required
                      />
                      <span>{DISCLAIMER_CHECK}</span>
                    </label>
                  </>
                ) : null}
                {error ? (
                  <p className="text-sm text-fg" role="alert">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" disabled={pending} className="w-full">
                  {pending
                    ? "Working…"
                    : mode === "up"
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </form>
              <p className="mt-4 text-center text-sm text-muted">
                You can look at the board without an account. Sign up to post
                or to request a connection.
              </p>
              <button
                type="button"
                className="mt-4 w-full text-center text-sm text-muted hover:text-fg"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setError(null);
                }}
              >
                {mode === "in"
                  ? "New here? Create a free account"
                  : "Already have an account? Sign in"}
              </button>
              <Link
                to="/office"
                className="mt-6 block text-center text-xs text-subtle hover:text-muted"
              >
                Office
              </Link>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted">Sign-in is disabled.</p>
          )}
        </div>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  visible,
  onToggle,
  showLabel,
  hideLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
  showLabel: string;
  hideLabel: string;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          className="pr-11"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-0 right-0 text-muted hover:bg-transparent hover:text-fg"
          onClick={onToggle}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? <EyeOff /> : <Eye />}
        </Button>
      </div>
    </div>
  );
}
