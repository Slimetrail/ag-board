import { useEffect, useRef, useState } from "react";
import {
  getOrOpenThread,
  getThreadState,
  markDealDone,
  sendMessage,
  submitRating,
  type ThreadState,
} from "@/lib/messages";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  canSubmitCategoryRating,
  CategoryStarPick,
  formatSubmittedRating,
  NeighborRating,
} from "@/components/neighbor-rating";
import type { PartialCategoryScores } from "@/lib/connect-helpers";

export function MessageThread({
  otherUserId,
  listingId,
  currentUserId,
}: {
  otherUserId: string;
  listingId?: number;
  currentUserId: string;
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
  const bottomRef = useRef<HTMLDivElement>(null);

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
    const timer = window.setInterval(() => {
      void getThreadState({ data: { threadId } })
        .then(setThread)
        .catch(() => undefined);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

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

  async function finishDeal() {
    if (!thread) return;
    setPending(true);
    setError(null);
    try {
      setThread(await markDealDone({ data: { threadId: thread.threadId } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark the deal done.");
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
    return <p className="mt-4 text-sm text-muted">{error}</p>;
  }

  if (!thread) {
    return <p className="mt-4 text-sm text-muted">Opening the private thread…</p>;
  }

  const handle = thread.other.username;

  return (
    <div className="mt-4">
      <p className="text-[12px] tracking-wide text-subtle uppercase">
        Private messages
      </p>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        Connected. Talk here — real name, address, phone, and email stay off
        public profiles.
      </p>
      <NeighborRating
        className="mt-2"
        average={thread.other.ratingAverage}
        count={thread.other.ratingCount}
        categoryAverages={thread.other.categoryAverages}
      />

      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto rounded-lg bg-wash/60 p-3">
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
        <div ref={bottomRef} />
      </div>

      <form
        className="mt-3 grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          rows={3}
          placeholder={`Message @${handle}…`}
          aria-label="Private message"
        />
        <Button type="submit" disabled={pending || !body.trim()}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>

      <div className="mt-4 border-t border-border pt-4">
        {thread.dealDone ? (
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
        ) : (
          <div>
            <p className="text-sm leading-relaxed text-muted">
              When the handshake is finished, either of you can mark the deal
              done. That unlocks one rating each.
            </p>
            <Button
              className="mt-3"
              variant="outline"
              disabled={pending}
              onClick={() => void finishDeal()}
            >
              {pending ? "Saving…" : "Deal done"}
            </Button>
          </div>
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
