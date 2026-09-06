import { OwnerInterestRows, useIncomingInvites } from "@/components/owner-interest-banner";

export function ListingInviteInbox({ listingId }: { listingId: number }) {
  const { incoming, pendingId, respond } = useIncomingInvites(listingId);

  if (incoming.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-[12px] tracking-wide text-subtle uppercase">
        Interested neighbors
      </p>
      <div className="mt-3">
        <OwnerInterestRows
          invites={incoming}
          pendingId={pendingId}
          showListing
          onAccept={(id) => void respond(id, true)}
          onDeny={(id) => void respond(id, false)}
        />
      </div>
    </div>
  );
}
