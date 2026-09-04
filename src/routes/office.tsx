import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { PriceEditor } from "@/components/price-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  claimOffice,
  getAdminStatus,
  loginAdmin,
  logoutAdmin,
} from "@/lib/admin";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { ALL_STATE_CODES, STATE_META, type StateCode } from "@/lib/geo";
import {
  getBoardSettings,
  listImproveNotes,
  listOfficeBoard,
  setEnabledStates,
  type ImproveNote,
  type OfficeListing,
  type OfficeTrade,
} from "@/lib/office";
import { cn, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/office")({
  component: OfficePage,
});

function OfficePage() {
  const [mode, setMode] = useState<"loading" | "login" | "desk">("loading");
  const { user, isPending } = useCurrentUserState();

  function enterDesk() {
    setMode("desk");
  }

  useEffect(() => {
    if (isPending) return;
    let live = true;
    void getAdminStatus()
      .then(async (status) => {
        if (!live) return;
        if (status.signedIn) {
          setMode("desk");
          return;
        }
        if (user) {
          try {
            await claimOffice();
            if (live) setMode("desk");
            return;
          } catch {
            /* not the owner */
          }
        }
        if (live) setMode("login");
      })
      .catch(() => {
        if (live) setMode("login");
      });
    return () => {
      live = false;
    };
  }, [user, isPending]);

  if (mode === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening…
      </div>
    );
  }
  if (mode === "login") return <AdminLogin onDone={enterDesk} />;
  return <OfficeDesk />;
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="relative isolate min-h-dvh">
      <div className="mx-auto max-w-lg px-4 py-16">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Admin
      </p>
      <h1 className="mt-2 font-display text-4xl">Office login</h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Owner and approved agent accounts. Sign in with office email and
        password to open this desk.
      </p>
      <form
        className="mt-4 grid gap-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          void loginAdmin({ data: { username, password } })
            .then(() => onDone())
            .catch((err: unknown) =>
              setError(err instanceof Error ? err.message : "Could not sign in."),
            )
            .finally(() => setPending(false));
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="office-user">Email</Label>
          <Input
            id="office-user"
            type="text"
            inputMode="email"
            value={username}
            onChange={(event) => setUsername(event.target.value.toLowerCase())}
            required
            autoComplete="username"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="office-pass">Password</Label>
          <Input
            id="office-pass"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error ? (
          <p className="text-sm text-fg" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Sign in to the office"}
        </Button>
      </form>
      </div>
    </div>
  );
}

function OfficeDesk() {
  const [notes, setNotes] = useState<ImproveNote[]>([]);
  const [listings, setListings] = useState<OfficeListing[]>([]);
  const [trades, setTrades] = useState<OfficeTrade[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void Promise.all([listImproveNotes(), listOfficeBoard()])
      .then(([improve, board]) => {
        setNotes(improve);
        setListings(board.listings);
        setTrades(board.trades);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening the desk…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
            Office
          </p>
          <h1 className="mt-2 font-display text-4xl sm:text-5xl">
            Notes and trades, quiet.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Neighbors do not see this page. They are not notified when you read
            a note or a trade.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void logoutAdmin().then(() => window.location.reload());
          }}
        >
          Sign out of office
        </Button>
      </div>
      <p className="mt-4">
        <Link to="/" className="text-sm text-muted underline-offset-2 hover:text-fg hover:underline">
          Back to the board
        </Link>
      </p>

      <OfficeStates />

      <section className="mt-12">
        <h2 className="font-display text-3xl">How can we improve</h2>
        <div className="mt-6 grid gap-4">
          {notes.length === 0 ? (
            <p className="text-sm text-muted">No notes yet.</p>
          ) : (
            notes.map((note) => (
              <article
                key={note.id}
                className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)]"
              >
                <p className="text-sm text-subtle">
                  @{note.username} · {timeAgo(note.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
                  {note.body}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Every listing</h2>
        <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">Listing</th>
                <th className="px-4 py-3 font-medium">Deal</th>
                <th className="px-4 py-3 font-medium">Who</th>
                <th className="px-4 py-3 font-medium">Place</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((row) => (
                <tr key={row.id} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to="/listing/$slug"
                      params={{ slug: row.slug }}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-subtle">
                      {row.category} · {timeAgo(row.createdAt)}
                    </p>
                    <PriceEditor listingId={row.id} priceLabel={row.priceLabel} office />
                  </td>
                  <td className="px-4 py-3 text-muted">{row.dealType}</td>
                  <td className="px-4 py-3 text-muted">
                    {row.username ? `@${row.username}` : row.farmName}
                    {row.email ? (
                      <p className="text-xs text-subtle">{row.email}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.location}
                    <p className="text-xs text-subtle">{row.region}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="font-display text-3xl">Connection trades</h2>
        <div className="mt-6 overflow-x-auto rounded-xl bg-surface shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border text-subtle">
              <tr>
                <th className="px-4 py-3 font-medium">From</th>
                <th className="px-4 py-3 font-medium">To</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Listing</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-muted" colSpan={4}>
                    No connection requests yet.
                  </td>
                </tr>
              ) : (
                trades.map((row) => (
                  <tr key={row.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3">@{row.fromUsername}</td>
                    <td className="px-4 py-3">@{row.toUsername}</td>
                    <td className="px-4 py-3 text-muted">{row.status}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.listingTitle ?? "—"}
                      <p className="text-xs text-subtle">{timeAgo(row.createdAt)}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OfficeStates() {
  const [enabled, setEnabled] = useState<StateCode[]>(["SC"]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void getBoardSettings()
      .then((settings) => setEnabled(settings.enabledStates))
      .catch(() => setEnabled(["SC"]));
  }, []);

  function toggle(code: StateCode) {
    if (code === "SC") return;
    const next = enabled.includes(code)
      ? enabled.filter((item) => item !== code)
      : [...enabled, code];
    setEnabled(next);
    setPending(true);
    void setEnabledStates({ data: { states: next } })
      .then((result) => setEnabled(result.enabledStates))
      .finally(() => setPending(false));
  }

  return (
    <section className="mt-12 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <h2 className="font-display text-3xl">States on the board</h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        South Carolina stays on. Turn on another state when you want that
        county board too. Neighbors only see states you open.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {ALL_STATE_CODES.map((code) => {
          const on = enabled.includes(code);
          return (
            <button
              key={code}
              type="button"
              disabled={code === "SC" || pending}
              onClick={() => toggle(code)}
              className={`h-10 rounded-full px-4 text-sm font-medium ${
                on
                  ? "bg-primary text-primary-fg"
                  : "bg-wash text-muted hover:text-fg"
              }`}
            >
              {STATE_META[code].name}
            </button>
          );
        })}
      </div>
    </section>
  );
}