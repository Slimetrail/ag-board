import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { FarmAvatar } from "@/components/farm-avatar";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  getConnection,
  getPublicByUserId,
  respondInvite,
  sendInvite,
  type ConnectionRelation,
  type PersonalProfile,
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
  const [personal, setPersonal] = useState<PersonalProfile | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);

  async function load() {
    if (user) {
      const view = await getConnection({ data: { userId } });
      setRelation(view.relation);
      setPub(view.public);
      setPersonal(view.personal);
      setPendingInviteId(view.pendingInviteId);
      return;
    }
    const publicProfile = await getPublicByUserId({ data: { userId } });
    setPub(publicProfile);
    setPersonal(null);
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
        </div>
      </div>
      {pub?.bio || fallbackNote ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {pub?.bio || fallbackNote}
        </p>
      ) : null}

      {relation === "self" ? (
        <p className="mt-4 text-sm text-subtle">This is your card.</p>
      ) : relation === "connected" && personal ? (
        <div className="mt-4 grid gap-1 text-sm">
          <p className="text-[12px] tracking-wide text-subtle uppercase">
            Shared after they accepted
          </p>
          {personal.realName ? <p>{personal.realName}</p> : null}
          {personal.place ? <p>{personal.place}</p> : null}
          {personal.email ? (
            <p>
              <a className="underline-offset-2 hover:underline" href={`mailto:${personal.email}`}>
                {personal.email}
              </a>
            </p>
          ) : null}
          {personal.phone ? (
            <p>
              <a className="underline-offset-2 hover:underline" href={`tel:${personal.phone}`}>
                {personal.phone}
              </a>
            </p>
          ) : null}
        </div>
      ) : !user ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Sign in to request a connection. Real name, address, phone, and
            email stay hidden until they press Accept request.
          </p>
          <Button asChild className="mt-3 w-full">
            <Link to="/login">Sign in to request</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">
            Real name, address, phone, and email stay hidden until they press
            Accept request.
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
