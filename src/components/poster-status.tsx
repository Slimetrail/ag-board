import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setListingStatus } from "@/lib/listings";

export function PosterStatus({
  listingId,
  deciding,
}: {
  listingId: number;
  deciding: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();

  async function run(action: "deciding" | "open" | "delete") {
    setPending(true);
    try {
      const result = await setListingStatus({ data: { listingId, action } });
      if (result.gone) {
        toast("Listing taken off the board");
        await navigate({ to: "/market" });
        return;
      }
      toast(
        action === "deciding"
          ? "Marked deciding. Comes off in two weeks unless you take it off."
          : "Listing is open again.",
      );
      await router.invalidate();
    } catch {
      toast("Could not change that listing.");
    } finally {
      setPending(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="mt-6 grid gap-3 border-t border-border pt-5">
      <p className="text-sm font-medium">Your listing</p>
      <p className="text-sm leading-relaxed text-muted">
        {deciding
          ? "A trade is accepted in real life and waiting. Deciding shows in red. If you leave it on, this post comes off the board in two weeks."
          : "If a trade is accepted but not done yet, mark deciding. Or delete it to take it off now."}
      </p>
      <div className="flex flex-wrap gap-2">
        {deciding ? (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void run("open")}
          >
            Take deciding off
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => void run("deciding")}
          >
            Deciding
          </Button>
        )}
        {confirmDelete ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => void run("delete")}
          >
            {pending ? "Removing…" : "Yes, delete it"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
