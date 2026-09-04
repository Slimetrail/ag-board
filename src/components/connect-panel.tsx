import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FarmAvatar } from "@/components/farm-avatar";
import { MessageThread } from "@/components/message-thread";
import { NeighborRating } from "@/components/neighbor-rating";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getConnection,
  getPublicByUserId,
  respondInvite,
  sendInvite,
  type ConnectionRelation,
  type PublicProfile,
} from "@/lib/profiles";

export function ConnectPanel({
  userId,
  listingId,
  fallbackNote,
  kicker = "Posted by",
}: {
  userId: string;
  listingId?: number;
  fallbackNote?: string;
  kicker?: string;
}) {
  const navigate = useNavigate();
  const { user, isPending: authPending } = useCurrentUserState();
  const [relation, setRelation] = useState<ConnectionRelation>("none");
  const [pub, setPub] = useState<PublicProfile | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    if (user) {
      const view = await getConnection({ data: { userId } });
      setRelation(view.relation);
      setPub(view.public);
      setPendingInviteId(view.pendingInviteId);
      return;
    }
    const publicProfile = await getPublicByUserId({ data: { userId } });
    setPub(publicProfile);
    setRelation("none");
  }

  useEffect(() => {
    if (authPending) return;
    void load();
  }, [userId, user, authPending]);

  const handle = pub?.username ?? "neighbor";

  async function requestConnect() {
    setPending(true);
    try {
      const result = await sendInvite({
        data: { toUserId: userId, listingId },
      });
      setRelation(result.relation);
      if (result.relation === "pending-in" && result.pendingInviteId) {
        setPendingInviteId(result.pendingInviteId);
      }
    } catch (err) {
      if (String(err instanceof Error ? err.message : err).includes("Agree")) {
        void navigate({ to: "/agree" });
      }
    } finally {
      setPending(false);
    }
  }

  async function acceptRequest() {
    if (!pendingInviteId) return;
    setPending(true);
    try {
      await respondInvite({ data: { id: pendingInviteId, accept: true } });
      await load();
    } catch (err) {
      if (String(err instanceof Error ? err.message : err).includes("Agree")) {
        void navigate({ to: "/agree" });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
      <p className="text-[12px] tracking-wide text-subtle uppercase">{kicker}</p>
      <div className="mt-3 flex items-center gap-3">
        <FarmAvatar name={handle} src={pub?.imagePath} className="size-12" />
        <div className="min-w-0">
          <h2 className="font-display text-2xl leading-tight">@{handle}</h2>
          {pub ? (
            <Link
              to="/u/$username"
              params={{ username: pub.username }}
              className="text-sm text-muted hover:text-fg"
            >
              Public profile
            </Link>
          ) : (
            <p className="text-sm text-muted">On the board</p>
          )}
          {pub ? (
            <NeighborRating
              className="mt-1"
              average={pub.ratingAverage}
              count={pub.ratingCount}
            />
          ) : null}
        </div>
      </div>
      {pub?.bio || fallbackNote ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {pub?.bio || fallbackNote}
        </p>
      ) : null}

      {relation === "self" ? (
        <p className="mt-4 text-sm text-subtle">This is your card.</p>
      ) : relation === "connected" && user ? (
        <MessageThread
          otherUserId={userId}
          listingId={listingId}
          currentUserId={user.id}
        />
      ) : !user ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Sign in to request a connection. Real name, address, phone, and
            email stay private. After they accept, you talk in a private
            message thread.
          </p>
          <Button asChild className="mt-3 w-full">
            <Link to="/login">Sign in to request</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Real name, address, phone, and email stay private. Accept opens a
            private message thread — that is the contact channel.
          </p>
          {relation === "pending-in" ? (
            <Button className="mt-3 w-full" disabled={pending} onClick={() => void acceptRequest()}>
              {pending ? "Saving…" : "Accept request"}
            </Button>
          ) : (
            <Button
              className="mt-3 w-full"
              variant={relation === "pending-out" ? "outline" : "default"}
              disabled={pending || relation === "pending-out"}
              onClick={() => void requestConnect()}
            >
              {pending
                ? "Sending…"
                : relation === "pending-out"
                  ? "Request sent — waiting on Accept"
                  : "Request to connect"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
