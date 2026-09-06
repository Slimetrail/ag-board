import { useEffect, useRef, useState } from "react";
import {
  disconnectConnection,
  getOrOpenThread,
  getThreadState,
  markDealDone,
  markDealPending,
  sendMessage,
  submitRating,
  THREAD_POLL_MS,
  type ThreadState,
} from "@/lib/messages";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DisconnectButton } from "@/components/disconnect-button";
import { Textarea } from "@/components/ui/textarea";
import {
  canSubmitCategoryRating,
  CategoryStarPick,
  formatSubmittedRating,
  NeighborRating,
} from "@/components/neighbor-rating";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import {
  canDisconnectConnection,
  canMarkDealDone,
  canMarkDealPending,
  shouldShowConnectedChat,
  type PartialCategoryScores,
} from "@/lib/connect-helpers";

export function MessageThread({
  otherUserId,
  listingId,
  currentUserId,
  onLeftConnection,
}: {
  otherUserId: string;
  listingId?: number;
  currentUserId: string;
  /** Listing photo chat: hide the kept visitor thread after a non-deal disconnect. */
  onLeftConnection?: () => void;
}) {
  const [thread, setThread] = useState<ThreadState | null>(null);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [ratingPending, setRatingPending] = useState(false);
  const [draftScores, setDraftScores] = useState<PartialCategoryScores>({
    honesty: null,
    courtesy: null,
    reliability: null,
  });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void getOrOpenThread({
      data: { otherUserId, listingId },
    })
      .then((next) => {
        if (!cancelled) setThread(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not open the thread.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [otherUserId, listingId]);

  const threadId = thread?.threadId;
  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    function refresh() {
      void getThreadState({ data: { threadId: threadId! } })
        .then((next) => {
          if (!cancelled) setThread(next);
        })
        .catch(() => undefined);
    }
    const timer = window.setInterval(refresh, THREAD_POLL_MS);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [threadId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [thread?.messages.length]);

  useEffect(() => {
    if (thread?.connectionEnded && !thread.dealDone) {
      onLeftConnection?.();
    }
  }, [thread?.connectionEnded, thread?.dealDone, onLeftConnection]);

  async function send() {
    if (!thread || !body.trim()) return;
    setPending(true);
    setError(null);
    try {
      const next = await sendMessage({
        data: { threadId: thread.threadId, body: body.trim() },
      });
      setThread(next);
      setBody("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that.");
    } finally {
      setPending(false);
    }
  }

  async function setDealPending() {
    if (!thread) return;
    setPending(true);
    setError(null);
    try {
      setThread(await markDealPending({ data: { threadId: thread.threadId } }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not mark Deal pending.",
      );
    } finally {
      setPending(false);
    }
  }

  async function finishDeal() {
    if (!thread) return;
    setPending(true);
    setError(null);
    try {
      setThread(await markDealDone({ data: { threadId: thread.threadId } }));
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INVITES_CHANGED));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark the deal done.");
    } finally {
      setPending(false);
    }
  }

  async function leaveConnection() {
    if (!thread) return;
    setPending(true);
    setError(null);
    try {
      setThread(
        await disconnectConnection({ data: { threadId: thread.threadId } }),
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INVITES_CHANGED));
      }
      onLeftConnection?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not disconnect.",
      );
    } finally {
      setPending(false);
    }
  }

  async function rate() {
    if (!thread || !canSubmitCategoryRating(draftScores)) return;
    setRatingPending(true);
    setError(null);
    try {
      setThread(
        await submitRating({
          data: {
            threadId: thread.threadId,
            honesty: draftScores.honesty!,
            courtesy: draftScores.courtesy!,
            reliability: draftScores.reliability!,
          },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that rating.");
    } finally {
      setRatingPending(false);
    }
  }

  if (error && !thread) {
    return <p className="text-sm text-muted">{error}</p>;
  }

  if (!thread) {
    return <p className="text-sm text-muted">Opening the private thread…</p>;
  }

  const handle = thread.other.username;
  const showPending = canMarkDealPending(
    thread.isListingOwner,
    thread.dealStatus,
  );
  const showDone = canMarkDealDone(thread.isListingOwner, thread.dealStatus);
  const activeChat = shouldShowConnectedChat(thread.connectionEnded);
  const showDisconnect = canDisconnectConnection({
    connectionEnded: thread.connectionEnded,
    dealDone: thread.dealDone,
  });

  return (
    <div className="flex min-h-0 flex-col">
      <div className="shrink-0">
        <p className="text-[12px] tracking-wide text-subtle uppercase">
          {activeChat ? "Private messages" : thread.dealDone ? "Deal done" : "Disconnected"}
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {activeChat
            ? `Connected with @${handle}. Talk here.`
            : thread.dealDone
              ? `This connection has ended. Rate @${handle} if you have not yet. Interested + Accept opens a new thread.`
              : `This connection has ended. Interested + Accept opens a new thread.`}
        </p>
        <NeighborRating
          className="mt-1"
          average={thread.other.ratingAverage}
          count={thread.other.ratingCount}
          categoryAverages={thread.other.categoryAverages}
        />
      </div>

      <div className="mt-3 flex min-h-[14rem] flex-1 flex-col rounded-lg bg-wash/60">
        <div className="min-h-[10rem] flex-1 space-y-3 overflow-y-auto p-3">
          {thread.messages.length === 0 ? (
            <p className="text-sm text-subtle">
              No messages yet. Arrange pickup or a handshake here.
            </p>
          ) : (
            thread.messages.map((message) => {
              const mine = message.senderUserId === currentUserId;
              return (
                <div key={message.id} className={mine ? "text-right" : "text-left"}>
                  <p className="text-[11px] text-subtle">
                    {mine ? "You" : `@${handle}`}
                    {message.createdAt ? ` · ${timeAgo(message.createdAt)}` : ""}
                  </p>
                  <p className="mt-0.5 inline-block max-w-[90%] rounded-lg bg-surface px-3 py-2 text-left text-sm leading-relaxed shadow-[var(--shadow-card)]">
                    {message.body}
                  </p>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {activeChat ? (
          <form
            className="grid gap-2 border-t border-border/70 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              maxLength={1000}
              rows={2}
              placeholder={`Message @${handle}…`}
              aria-label="Private message"
            />
            <Button type="submit" disabled={pending || !body.trim()}>
              {pending ? "Sending…" : "Send"}
            </Button>
          </form>
        ) : null}
      </div>

      {showDisconnect ? (
        <DisconnectButton
          className="mt-4 w-full"
          busy={pending}
          onDisconnect={() => void leaveConnection()}
        />
      ) : null}

      <div className="mt-4 shrink-0 border-t border-border pt-4">
        {thread.dealStatus === "done" ? (
          <div className="grid gap-2">
            <p className="text-sm text-muted">Deal marked done.</p>
            {thread.myRating ? (
              <p className="text-sm text-muted">
                You rated @{handle}: {formatSubmittedRating(thread.myRating)}.
                {thread.theyRated
                  ? " They left a rating too."
                  : " Waiting on their rating."}
              </p>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-muted">
                  Rate @{handle} on all three — Honesty, Courtesy, and
                  Reliability.
                </p>
                <CategoryStarPick
                  scores={draftScores}
                  disabled={ratingPending}
                  onChange={setDraftScores}
                />
                <Button
                  type="button"
                  disabled={ratingPending || !canSubmitCategoryRating(draftScores)}
                  onClick={() => void rate()}
                >
                  {ratingPending ? "Saving…" : "Submit rating"}
                </Button>
              </div>
            )}
          </div>
        ) : thread.isListingOwner ? (
          <div>
            {thread.dealStatus === "pending" ? (
              <p className="text-sm leading-relaxed text-muted">
                Deal pending. After you meet, mark Deal done. That unlocks one
                rating each.
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-muted">
                When you are lining up the handshake, mark Deal pending. After
                you meet, mark Deal done. That unlocks one rating each.
              </p>
            )}
            {showPending ? (
              <Button
                className="mt-3"
                variant="outline"
                disabled={pending}
                onClick={() => void setDealPending()}
              >
                {pending ? "Saving…" : "Deal pending"}
              </Button>
            ) : null}
            {showDone ? (
              <Button
                className="mt-3"
                variant="outline"
                disabled={pending}
                onClick={() => void finishDeal()}
              >
                {pending ? "Saving…" : "Deal done"}
              </Button>
            ) : null}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            {thread.dealStatus === "pending"
              ? "Deal pending. The listing owner marks Deal done after you meet. Then you can both rate."
              : "The listing owner marks Deal pending, then Deal done after you meet. That unlocks one rating each."}
          </p>
        )}
      </div>
      {error ? (
        <p className="mt-3 text-sm text-fg" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
