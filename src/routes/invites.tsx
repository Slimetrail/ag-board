import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { FarmAvatar } from "@/components/farm-avatar";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import {
  listInvites,
  respondInvite,
  type InviteRow,
} from "@/lib/profiles";

export const Route = createFileRoute("/invites")({
  component: InvitesPage,
});

function InvitesPage() {
  return (
    <RequireUse reason="Connection requests need an account. You can look at listings without signing in.">
      <InvitesList />
    </RequireUse>
  );
}

function InvitesList() {
  const [incoming, setIncoming] = useState<InviteRow[]>([]);
  const [outgoing, setOutgoing] = useState<InviteRow[]>([]);
  const [connected, setConnected] = useState<InviteRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const data = await listInvites();
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
    setConnected(data.connected);
    setLoaded(true);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Gate
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Invites</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        Accepting a request is the only way real name, address, phone, and
        email get shared. Until you press Accept request, neighbors only see
        a username and picture.
      </p>

      {!loaded ? (
        <p className="mt-10 text-sm text-muted">Checking the gate…</p>
      ) : (
        <div className="mt-10 grid gap-10">
          <InviteGroup title="Waiting on you" empty="No one at the gate right now.">
            {incoming.map((invite) => (
              <InviteCard
                key={invite.id}
                invite={invite}
                actions={
                  <>
                    <Button
                      size="sm"
                      onClick={() =>
                        void respondInvite({ data: { id: invite.id, accept: true } }).then(load)
                      }
                    >
                      Accept request
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void respondInvite({ data: { id: invite.id, accept: false } }).then(load)
                      }
                    >
                      Decline
                    </Button>
                  </>
                }
              />
            ))}
          </InviteGroup>
          <InviteGroup title="Sent" empty="You haven't invited anyone yet.">
            {outgoing.map((invite) => (
              <InviteCard key={invite.id} invite={invite} />
            ))}
          </InviteGroup>
          <InviteGroup title="Connected" empty="No shared details yet.">
            {connected.map((invite) => (
              <InviteCard key={invite.id} invite={invite} />
            ))}
          </InviteGroup>
        </div>
      )}
    </div>
  );
}

function InviteGroup({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode;
}) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <section>
      <h2 className="font-display text-2xl">{title}</h2>
      {count === 0 ? (
        <p className="mt-3 text-sm text-muted">{empty}</p>
      ) : (
        <div className="mt-4 grid gap-3">{children}</div>
      )}
    </section>
  );
}

function InviteCard({
  invite,
  actions,
}: {
  invite: InviteRow;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)]">
      <FarmAvatar
        name={invite.other.username}
        src={invite.other.imagePath}
        className="size-11"
      />
      <div className="min-w-0 flex-1">
        <p className="font-medium">@{invite.other.username}</p>
        <Link
          to="/u/$username"
          params={{ username: invite.other.username }}
          className="text-sm text-muted hover:text-fg"
        >
          @{invite.other.username}
        </Link>
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
