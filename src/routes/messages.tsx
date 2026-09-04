import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FarmAvatar } from "@/components/farm-avatar";
import { MessageThread } from "@/components/message-thread";
import { RequireUse } from "@/components/require-use";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listThreads, type ThreadSummary } from "@/lib/messages";
import { cn, timeAgo } from "@/lib/utils";

export type MessagesSearch = {
  with?: string;
};

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): MessagesSearch => ({
    with: typeof search.with === "string" && search.with ? search.with : undefined,
  }),
  component: MessagesPage,
});

function MessagesPage() {
  return (
    <RequireUse reason="Private messages need an account. Looking at listings does not.">
      <MessagesList />
    </RequireUse>
  );
}

function MessagesList() {
  const { user } = useCurrentUserState();
  const search = Route.useSearch();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(search.with);

  useEffect(() => {
    void listThreads()
      .then((data) => {
        setThreads(data.threads);
        setLoaded(true);
        if (!search.with && data.threads[0]) {
          setSelected(data.threads[0].other.userId);
        }
      })
      .catch(() => setLoaded(true));
  }, [search.with]);

  useEffect(() => {
    if (search.with) setSelected(search.with);
  }, [search.with]);

  const open = threads.find((thread) => thread.other.userId === selected);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Private
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Messages</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        After Accept, talk here. Listing notes stay public — keep names,
        addresses, phones, and emails out of those.
      </p>

      {!loaded ? (
        <p className="mt-10 text-sm text-muted">Opening your threads…</p>
      ) : threads.length === 0 && !selected ? (
        <p className="mt-10 text-sm text-muted">
          No connections yet. Accept a request on{" "}
          <Link to="/invites" className="underline-offset-2 hover:underline">
            Invites
          </Link>{" "}
          to open a thread.
        </p>
      ) : (
        <div className="mt-10 grid gap-8">
          <div className="grid gap-3">
            {threads.map((thread) => {
              const active = thread.other.userId === selected;
              return (
                <button
                  key={thread.threadId}
                  type="button"
                  onClick={() => setSelected(thread.other.userId)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-4 text-left shadow-[var(--shadow-card)]",
                    active ? "bg-wash" : "bg-surface hover:bg-wash/70",
                  )}
                >
                  <FarmAvatar
                    name={thread.other.username}
                    src={thread.other.imagePath}
                    className="size-11"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">@{thread.other.username}</p>
                    <p className="truncate text-sm text-muted">
                      {thread.lastBody ?? "No messages yet"}
                    </p>
                  </div>
                  {thread.lastAt ? (
                    <p className="text-xs text-subtle">{timeAgo(thread.lastAt)}</p>
                  ) : null}
                </button>
              );
            })}
          </div>
          {user && (open || selected) ? (
            <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <MessageThread
                otherUserId={open?.other.userId ?? selected!}
                listingId={open?.listingId ?? undefined}
                currentUserId={user.id}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
