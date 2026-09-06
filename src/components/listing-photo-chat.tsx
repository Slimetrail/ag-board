import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { MessageThread } from "@/components/message-thread";
import { OwnerListingThreads } from "@/components/owner-listing-threads";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  shouldRenderOwnerListingThreads,
  shouldRenderVisitorThread,
  shouldShowCancelRequest,
} from "@/lib/connect-helpers";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import { THREAD_POLL_MS } from "@/lib/messages";
import {
  cancelInvite,
  getConnection,
  type ConnectionRelation,
} from "@/lib/profiles";

function notifyInvitesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVITES_CHANGED));
}

/** Private thread for a listing — sits directly under the photo tile. */
export function ListingPhotoChat({
  ownerUserId,
  listingId,
}: {
  ownerUserId: string;
  listingId: number;
}) {
  const { user, isPending: authPending } = useCurrentUserState();
  const [relation, setRelation] = useState<ConnectionRelation | null>(null);
  const [keptOwnerId, setKeptOwnerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const leaveKeptVisitorThread = useCallback(() => {
    setKeptOwnerId(null);
    setRelation((current) =>
      current && current !== "self" ? "none" : current,
    );
  }, []);

  useEffect(() => {
    if (authPending) return;
    if (!user) {
      setRelation(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const view = await getConnection({ data: { userId: ownerUserId } });
        if (!cancelled) setRelation(view.relation);
      } catch {
        if (!cancelled) setRelation(null);
      }
    }

    void load();
    const onChange = () => {
      void load();
    };
    window.addEventListener(INVITES_CHANGED, onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onChange);
    const timer = window.setInterval(onChange, THREAD_POLL_MS);
    return () => {
      cancelled = true;
      window.removeEventListener(INVITES_CHANGED, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onChange);
      window.clearInterval(timer);
    };
  }, [ownerUserId, user, authPending]);

  useEffect(() => {
    if (relation && shouldRenderVisitorThread(relation)) {
      setKeptOwnerId(ownerUserId);
    }
  }, [relation, ownerUserId]);

  async function withdraw() {
    setBusy(true);
    try {
      await cancelInvite({ data: { toUserId: ownerUserId } });
      setRelation("none");
      notifyInvitesChanged();
      toast("Request canceled", {
        description: "The owner will no longer see this Interested notice.",
      });
    } catch {
      toast("Could not cancel that request.");
    } finally {
      setBusy(false);
    }
  }

  if (!user || !relation) return null;

  if (shouldRenderOwnerListingThreads(relation)) {
    return (
      <OwnerListingThreads listingId={listingId} currentUserId={user.id} />
    );
  }

  if (
    shouldRenderVisitorThread(relation) ||
    keptOwnerId === ownerUserId
  ) {
    return (
      <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <MessageThread
          otherUserId={ownerUserId}
          listingId={listingId}
          currentUserId={user.id}
          onLeftConnection={leaveKeptVisitorThread}
        />
      </div>
    );
  }

  if (shouldShowCancelRequest(relation)) {
    return (
      <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <p className="text-[12px] tracking-wide text-subtle uppercase">
          Private messages
        </p>
        <p className="mt-0.5 text-sm text-muted">
          Interested — waiting on Accept. Chat opens after they Accept.
        </p>
        <CancelRequestButton
          className="mt-4 w-full"
          busy={busy}
          onCancel={() => void withdraw()}
        />
      </div>
    );
  }

  return null;
}
