import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Handshake } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  interestedButtonLabel,
  shouldShowInterested,
} from "@/lib/connect-helpers";
import {
  getConnection,
  sendInvite,
  type ConnectionRelation,
} from "@/lib/profiles";
import { cn } from "@/lib/utils";

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
    return () => {
      live = false;
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
          description: "They can Accept or Deny. Contact stays private until Accept.",
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

  const waiting = relation === "pending-out";

  return (
    <Button
      type="button"
      className={cn(className)}
      variant={waiting ? "outline" : "default"}
      disabled={pending || waiting}
      onClick={() => void markInterested()}
    >
      <Handshake className="size-4" />
      {interestedButtonLabel(relation, pending)}
    </Button>
  );
}
