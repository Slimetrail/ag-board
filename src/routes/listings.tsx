import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DraftRow } from "@/components/draft-row";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/lib/board-store";
import {
  deleteOwnDraft,
  listOwnDrafts,
  listOwnListings,
  type Listing,
} from "@/lib/listings";

export const Route = createFileRoute("/listings")({
  component: YourListingsPage,
});

function YourListingsPage() {
  return (
    <RequireUse reason="Your listings are tied to your account. Looking at the board does not need one.">
      <YourListings />
    </RequireUse>
  );
}

function YourListings() {
  const [posted, setPosted] = useState<Listing[] | null>(null);
  const [drafts, setDrafts] = useState<Listing[] | null>(null);
  const [draftPending, setDraftPending] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      const [postedRows, draftRows] = await Promise.all([
        listOwnListings().catch(() => [] as Listing[]),
        listOwnDrafts().catch(() => [] as Listing[]),
      ]);
      if (!live) return;
      setPosted(postedRows);
      setDrafts(draftRows);
    }
    void load();
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Your nail
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Your listings</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        Posts on the board from this account, plus drafts that still sit off
        the board.
      </p>

      {posted === null ? (
        <p className="mt-10 text-sm text-muted">Pulling your posts…</p>
      ) : posted.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl">Nothing on the board yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When you put a listing up, it shows here so you can get back to it.
          </p>
          <Button asChild className="mt-6">
            <Link to="/post">Post a listing</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10">
          <ViewToggle />
          <ListingGrid listings={posted} className="mt-6" />
        </div>
      )}

      <section className="mt-16" id="drafts">
        <h2 className="font-display text-3xl">Your drafts</h2>
        <p className="mt-2 text-sm text-muted">
          Only you can see these. They stay off the board until you put them
          up.
        </p>
        {drafts === null ? (
          <p className="mt-6 text-sm text-muted">Opening drafts…</p>
        ) : drafts.length === 0 ? (
          <p className="mt-6 text-sm text-muted">
            No drafts yet.{" "}
            <Link
              to="/post"
              className="underline-offset-2 hover:text-fg hover:underline"
            >
              Start a listing
            </Link>{" "}
            and save it before it is ready.
          </p>
        ) : (
          <div className="mt-6 grid gap-3">
            {drafts.map((draft) => (
              <DraftRow
                key={draft.id}
                listing={draft}
                pending={draftPending === draft.id}
                onDelete={() => {
                  setDraftPending(draft.id);
                  void deleteOwnDraft({ data: { id: draft.id } })
                    .then(() => {
                      setDrafts((rows) =>
                        (rows ?? []).filter((row) => row.id !== draft.id),
                      );
                      const stored = useBoardStore.getState().listingForm;
                      if (stored.draftId === draft.id) {
                        useBoardStore.getState().clearListingForm();
                      }
                      toast("Draft removed");
                    })
                    .catch(() => toast("Could not remove that draft."))
                    .finally(() => setDraftPending(null));
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
