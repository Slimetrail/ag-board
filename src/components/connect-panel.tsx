import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { FarmAvatar } from "@/components/farm-avatar";
import { InviteRespondButtons } from "@/components/invite-respond-buttons";
import { ListingInviteInbox } from "@/components/listing-invite-inbox";
import { MessageThread } from "@/components/message-thread";
import { NeighborRating } from "@/components/neighbor-rating";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  shouldEmbedConnectPanelThread,
  shouldRenderOwnerListingThreads,
  shouldRenderVisitorThread,
  shouldShowCancelRequest,
  shouldShowInviteRespond,
} from "@/lib/connect-helpers";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import {
  cancelInvite,
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
    const onChange = () => {
      void load();
    };
    window.addEventListener(INVITES_CHANGED, onChange);
    return () => window.removeEventListener(INVITES_CHANGED, onChange);
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

  async function respondToRequest(accept: boolean) {
    if (!pendingInviteId) return;
    setPending(true);
    try {
      await respondInvite({ data: { id: pendingInviteId, accept } });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INVITES_CHANGED));
      }
      await load();
    } catch (err) {
      if (String(err instanceof Error ? err.message : err).includes("Agree")) {
        void navigate({ to: "/agree" });
      }
    } finally {
      setPending(false);
    }
  }

  async function withdrawRequest() {
    setPending(true);
    try {
      await cancelInvite({ data: { toUserId: userId } });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(INVITES_CHANGED));
      }
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
              forSelf={relation === "self"}
              categoryAverages={pub.categoryAverages}
            />
          ) : null}
        </div>
      </div>
      {pub?.bio || fallbackNote ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {pub?.bio || fallbackNote}
        </p>
      ) : null}

      {shouldRenderOwnerListingThreads(relation) && user ? (
        <div className="mt-4">
          <p className="text-sm text-subtle">This is your card.</p>
          {listingId ? <ListingInviteInbox listingId={listingId} /> : null}
          {listingId ? null : (
            <p className="mt-3 text-sm text-muted">
              Private threads live under{" "}
              <Link to="/messages" className="underline-offset-2 hover:underline">
                Messages
              </Link>
              .
            </p>
          )}
        </div>
      ) : shouldRenderVisitorThread(relation) && user ? (
        shouldEmbedConnectPanelThread(listingId) ? (
          <MessageThread
            otherUserId={userId}
            listingId={listingId}
            currentUserId={user.id}
          />
        ) : null
      ) : !user ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            {listingId
              ? "Sign in to mark Interested. Real name, address, phone, and email stay private until they Accept."
              : "Sign in to request a connection. Real name, address, phone, and email stay private. After they accept, you talk in a private message thread."}
          </p>
          {listingId ? null : (
            <Button asChild className="mt-3 w-full">
              <Link to="/login">Sign in to request</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Real name, address, phone, and email stay private. Accept opens a
            private message thread — that is the contact channel.
          </p>
          {shouldShowInviteRespond(relation) ? (
            <InviteRespondButtons
              className="mt-3"
              disabled={pending}
              onAccept={() => void respondToRequest(true)}
              onDeny={() => void respondToRequest(false)}
            />
          ) : listingId ? (
            <div className="mt-3">
              <p className="text-sm text-subtle">
                {shouldShowCancelRequest(relation)
                  ? "Interested — waiting on Accept. Favorite stays a bookmark only."
                  : "Use Interested on the listing to send a request. Favorite does not notify them."}
              </p>
              {shouldShowCancelRequest(relation) ? (
                <CancelRequestButton
                  className="mt-3 w-full"
                  busy={pending}
                  onCancel={() => void withdrawRequest()}
                />
              ) : null}
            </div>
          ) : shouldShowCancelRequest(relation) ? (
            <div className="mt-3 grid gap-2">
              <Button className="w-full" variant="outline" disabled>
                Request sent — waiting on Accept
              </Button>
              <CancelRequestButton
                className="w-full"
                busy={pending}
                onCancel={() => void withdrawRequest()}
              />
            </div>
          ) : (
            <Button
              className="mt-3 w-full"
              disabled={pending}
              onClick={() => void requestConnect()}
            >
              {pending ? "Sending…" : "Request to connect"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
