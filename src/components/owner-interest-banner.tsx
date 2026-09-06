import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FarmAvatar } from "@/components/farm-avatar";
import { InviteRespondButtons } from "@/components/invite-respond-buttons";
import { interestedNeighborHeadline } from "@/lib/interest-notify";
import {
  listInvites,
  respondInvite,
  type InviteRow,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

export const INVITES_CHANGED = "ag-invites-changed";

function notifyInvitesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVITES_CHANGED));
}

export function useIncomingInvites(listingId?: number) {
  const [incoming, setIncoming] = useState<InviteRow[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function load() {
    const data = await listInvites();
    const rows = listingId
      ? data.incoming.filter((row) => row.listingId === listingId)
      : data.incoming;
    setIncoming(rows);
  }

  useEffect(() => {
    void load().catch(() => setIncoming([]));
    const onChange = () => {
      void load().catch(() => setIncoming([]));
    };
    window.addEventListener(INVITES_CHANGED, onChange);
    return () => window.removeEventListener(INVITES_CHANGED, onChange);
  }, [listingId]);

  async function respond(id: number, accept: boolean) {
    setPendingId(id);
    try {
      await respondInvite({ data: { id, accept } });
      notifyInvitesChanged();
      await load();
    } finally {
      setPendingId(null);
    }
  }

  return { incoming, pendingId, respond };
}

export function OwnerInterestRows({
  invites,
  pendingId,
  onAccept,
  onDeny,
  showListing = false,
}: {
  invites: InviteRow[];
  pendingId: number | null;
  onAccept: (id: number) => void;
  onDeny: (id: number) => void;
  showListing?: boolean;
}) {
  return (
    <div className="grid gap-4">
      {invites.map((invite) => (
        <div
          key={invite.id}
          className="grid gap-3 rounded-lg bg-wash/60 p-3 sm:grid-cols-[1fr_auto] sm:items-center"
        >
          <div className="flex min-w-0 items-center gap-3">
            <FarmAvatar
              name={invite.other.username}
              src={invite.other.imagePath}
              className="size-11"
            />
            <div className="min-w-0">
              <p className="text-sm font-medium">@{invite.other.username}</p>
              {showListing && invite.listing ? (
                <Link
                  to="/listing/$slug"
                  params={{ slug: invite.listing.slug }}
                  className="block truncate text-xs text-muted hover:text-fg"
                >
                  {invite.listing.title}
                </Link>
              ) : null}
              <Link
                to="/u/$username"
                params={{ username: invite.other.username }}
                className="text-xs text-muted hover:text-fg"
              >
                Open public profile
              </Link>
            </div>
          </div>
          <InviteRespondButtons
            size="sm"
            className="w-full min-w-[12.5rem] sm:w-auto"
            disabled={pendingId === invite.id}
            onAccept={() => onAccept(invite.id)}
            onDeny={() => onDeny(invite.id)}
          />
        </div>
      ))}
    </div>
  );
}

export function OwnerInterestBanner({
  listingId,
  showListing = false,
  className,
}: {
  listingId?: number;
  showListing?: boolean;
  className?: string;
}) {
  const { incoming, pendingId, respond } = useIncomingInvites(listingId);
  const listingInvites = listingId
    ? incoming
    : incoming.filter((row) => row.listingId != null);

  if (listingInvites.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border-2 border-primary bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6",
        className,
      )}
      aria-live="polite"
    >
      <p className="text-[12px] tracking-wide text-subtle uppercase">
        Waiting on you
      </p>
      <h2 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">
        {interestedNeighborHeadline(listingInvites.length)}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Open their public profile before you Accept or Deny. Real name, address,
        phone, and email stay private until Accept.
      </p>
      <div className="mt-4">
        <OwnerInterestRows
          invites={listingInvites}
          pendingId={pendingId}
          showListing={showListing}
          onAccept={(id) => void respond(id, true)}
          onDeny={(id) => void respond(id, false)}
        />
      </div>
    </section>
  );
}
