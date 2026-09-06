import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { CancelRequestButton } from "@/components/cancel-request-button";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  interestedButtonLabel,
  shouldShowCancelRequest,
  shouldShowInterested,
} from "@/lib/connect-helpers";
import { INVITES_CHANGED } from "@/lib/interest-notify";
import {
  cancelInvite,
  getConnection,
  sendInvite,
  type ConnectionRelation,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

function notifyInvitesChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVITES_CHANGED));
}

export function InterestedButton({
  ownerUserId,
  listingId,
  className,
}: {
  ownerUserId: string;
  listingId: number;
  className?: string;
}) {
  const navigate = useNavigate();
  const { user, isPending: authPending } = useCurrentUserState();
  const [relation, setRelation] = useState<ConnectionRelation>("none");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authPending) return;
    if (!user) {
      setRelation("none");
      setReady(true);
      return;
    }
    let live = true;
    function load() {
      void getConnection({ data: { userId: ownerUserId } })
        .then((view) => {
          if (!live) return;
          setRelation(view.relation);
          setReady(true);
        })
        .catch(() => {
          if (!live) return;
          setRelation("none");
          setReady(true);
        });
    }
    load();
    window.addEventListener(INVITES_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(INVITES_CHANGED, load);
    };
  }, [ownerUserId, user, authPending]);

  if (!ready) {
    return (
      <Button type="button" disabled className={cn(className)}>
        <Handshake className="size-4" />
        Interested
      </Button>
    );
  }

  if (!shouldShowInterested(relation)) return null;

  if (!user) {
    return (
      <Button asChild variant="default" className={cn(className)}>
        <Link to="/login">
          <Handshake className="size-4" />
          Interested
        </Link>
      </Button>
    );
  }

  async function markInterested() {
    setPending(true);
    try {
      const result = await sendInvite({
        data: { toUserId: ownerUserId, listingId },
      });
      setRelation(result.relation);
      if (result.relation === "pending-out") {
        toast("Interested request sent", {
          description:
            "They get a notice to Accept or Deny. Contact stays private until Accept.",
        });
      }
    } catch (err) {
      if (String(err instanceof Error ? err.message : err).includes("Agree")) {
        void navigate({ to: "/agree" });
      }
    } finally {
      setPending(false);
    }
  }

  async function withdraw() {
    setPending(true);
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
      setPending(false);
    }
  }

  const waiting = shouldShowCancelRequest(relation);

  if (waiting) {
    return (
      <div className={cn("flex min-w-[8.5rem] flex-1 flex-col gap-2", className)}>
        <Button type="button" variant="outline" disabled className="w-full">
          <Handshake className="size-4" />
          {interestedButtonLabel(relation, false)}
        </Button>
        <CancelRequestButton
          busy={pending}
          className="w-full"
          onCancel={() => void withdraw()}
        />
      </div>
    );
  }

  return (
    <Button
      type="button"
      className={cn(className)}
      disabled={pending}
      onClick={() => void markInterested()}
    >
      <Handshake className="size-4" />
      {interestedButtonLabel(relation, pending)}
    </Button>
  );
}
