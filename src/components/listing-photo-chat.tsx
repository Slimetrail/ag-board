import { useEffect, useState } from "react";
import { MessageThread } from "@/components/message-thread";
import { OwnerListingThreads } from "@/components/owner-listing-threads";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  shouldRenderOwnerListingThreads,
  shouldRenderVisitorThread,
} from "@/lib/connect-helpers";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import { THREAD_POLL_MS } from "@/lib/messages";
import { getConnection, type ConnectionRelation } from "@/lib/profiles";

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

  if (!user || !relation) return null;

  if (shouldRenderOwnerListingThreads(relation)) {
    return (
      <OwnerListingThreads listingId={listingId} currentUserId={user.id} />
    );
  }

  if (shouldRenderVisitorThread(relation)) {
    return (
      <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
        <MessageThread
          otherUserId={ownerUserId}
          listingId={listingId}
          currentUserId={user.id}
        />
      </div>
    );
  }

  return null;
}
