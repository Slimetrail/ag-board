import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { FarmAvatar } from "@/components/farm-avatar";
import { InviteRespondButtons } from "@/components/invite-respond-buttons";
import {
  listInvites,
  respondInvite,
  type InviteRow,
} from "@/lib/profiles";

export function ListingInviteInbox({ listingId }: { listingId: number }) {
  const [incoming, setIncoming] = useState<InviteRow[]>([]);
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function load() {
    const data = await listInvites();
    setIncoming(data.incoming.filter((row) => row.listingId === listingId));
  }

  useEffect(() => {
    void load();
  }, [listingId]);

  async function respond(id: number, accept: boolean) {
    setPendingId(id);
    try {
      await respondInvite({ data: { id, accept } });
      await load();
    } finally {
      setPendingId(null);
    }
  }

  if (incoming.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="text-[12px] tracking-wide text-subtle uppercase">
        Interested neighbors
      </p>
      <div className="mt-3 grid gap-3">
        {incoming.map((invite) => (
          <div key={invite.id} className="grid gap-3">
            <div className="flex items-center gap-3">
              <FarmAvatar
                name={invite.other.username}
                src={invite.other.imagePath}
                className="size-10"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">@{invite.other.username}</p>
                <Link
                  to="/u/$username"
                  params={{ username: invite.other.username }}
                  className="text-xs text-muted hover:text-fg"
                >
                  Marked Interested
                </Link>
              </div>
            </div>
            <InviteRespondButtons
              size="sm"
              disabled={pendingId === invite.id}
              onAccept={() => void respond(invite.id, true)}
              onDeny={() => void respond(invite.id, false)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
