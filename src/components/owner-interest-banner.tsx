import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { FarmAvatar } from "@/components/farm-avatar";
import { InviteRespondButtons } from "@/components/invite-respond-buttons";
import { ListingThumb } from "@/components/listing-thumb";
import { Button } from "@/components/ui/button";
import {
  INVITES_CHANGED,
  interestedNeighborHeadline,
  listingInterestInvites,
  shouldShowSiteInterestNotice,
} from "@/lib/interest-notify";
import {
  listInvites,
  respondInvite,
  type InviteRow,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

const INTEREST_POLL_MS = 8000;
const INTEREST_POPUP_KEY = "ag-interest-popup-seen";

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
    const timer = window.setInterval(onChange, INTEREST_POLL_MS);
    window.addEventListener("focus", onChange);
    return () => {
      window.removeEventListener(INVITES_CHANGED, onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(timer);
    };
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
            {invite.listing ? (
              <Link
                to="/listing/$slug"
                params={{ slug: invite.listing.slug }}
                className="shrink-0"
                aria-label={invite.listing.title}
              >
                <ListingThumb
                  src={invite.listing.imagePath}
                  title={invite.listing.title}
                />
              </Link>
            ) : null}
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

/** Banner + first-open popup so listing owners see Interested off the listing. */
export function SiteInterestNotice() {
  const { incoming, pendingId, respond } = useIncomingInvites();
  const listingInvites = listingInterestInvites(incoming);
  const interestKey = listingInvites
    .map((row) => row.id)
    .sort((a, b) => a - b)
    .join(",");
  const [popupOpen, setPopupOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hideInlineBanner =
    pathname === "/listings" || pathname.startsWith("/listing/");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldShowSiteInterestNotice(listingInvites.length) || !interestKey) {
      return;
    }
    const key = `${INTEREST_POPUP_KEY}:${interestKey}`;
    if (window.sessionStorage.getItem(key)) return;
    setPopupOpen(true);
  }, [interestKey, listingInvites.length]);

  function dismissPopup() {
    try {
      window.sessionStorage.setItem(`${INTEREST_POPUP_KEY}:${interestKey}`, "1");
    } catch {
      // private mode — still close the dialog
    }
    setPopupOpen(false);
  }

  if (!shouldShowSiteInterestNotice(listingInvites.length)) return null;

  return (
    <>
      {hideInlineBanner ? null : (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <OwnerInterestBanner showListing />
        </div>
      )}
      {popupOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-fg/65 p-3 sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) dismissPopup();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="interest-popup-title"
            className="w-full max-w-md rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6"
          >
            <p className="text-[12px] tracking-wide text-subtle uppercase">
              Waiting on you
            </p>
            <h2
              id="interest-popup-title"
              className="mt-1 font-display text-2xl text-fg"
            >
              {interestedNeighborHeadline(listingInvites.length)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Someone marked Interested. Accept or Deny here — you do not have
              to open the listing first.
            </p>
            <div className="mt-4">
              <OwnerInterestRows
                invites={listingInvites}
                pendingId={pendingId}
                showListing
                onAccept={(id) => void respond(id, true)}
                onDeny={(id) => void respond(id, false)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={dismissPopup}
            >
              Keep this on the banner
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
