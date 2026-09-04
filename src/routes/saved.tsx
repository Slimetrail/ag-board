import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useBoardStore } from "@/lib/board-store";
import { CATEGORY_META, listingDealBadge } from "@/lib/catalog";
import {
  deleteOwnDraft,
  listListings,
  listOwnDrafts,
  type Listing,
} from "@/lib/listings";
import { cn, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
});

function SavedPage() {
  const savedIds = useBoardStore((s) => s.savedIds);
  const postedIds = useBoardStore((s) => s.postedIds);
  const { user } = useCurrentUserState();
  const [saved, setSaved] = useState<Listing[] | null>(null);
  const [posted, setPosted] = useState<Listing[] | null>(null);
  const [drafts, setDrafts] = useState<Listing[] | null>(user ? null : []);
  const [draftPending, setDraftPending] = useState<number | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      const [savedRows, postedRows, draftRows] = await Promise.all([
        savedIds.length
          ? listListings({ data: { ids: savedIds } })
          : Promise.resolve([] as Listing[]),
        postedIds.length
          ? listListings({ data: { ids: postedIds } })
          : Promise.resolve([] as Listing[]),
        user
          ? listOwnDrafts().catch(() => [] as Listing[])
          : Promise.resolve([] as Listing[]),
      ]);
      if (!live) return;
      setSaved(savedRows);
      setPosted(postedRows);
      setDrafts(draftRows);
    }
    void load();
    return () => {
      live = false;
    };
  }, [savedIds, postedIds, user]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        On your nail
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Pinned listings</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        Favorites you marked to come back to. Kept on this device — a favorite
        does not notify the owner or send a request.
      </p>

      {saved === null ? (
        <p className="mt-10 text-sm text-muted">Pulling your list…</p>
      ) : saved.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl">Nothing pinned yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Browse the board and pin a listing you want to remember.
          </p>
          <Button asChild className="mt-6">
            <Link to="/market">Read the board</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10">
          <ViewToggle />
          <ListingGrid listings={saved} className="mt-6" />
        </div>
      )}

      {user ? (
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
      ) : null}

      {posted && posted.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl">Your posts</h2>
          <p className="mt-2 text-sm text-muted">
            Listings you put on the board from this device.
          </p>
          <ListingGrid listings={posted} className="mt-6" />
        </section>
      ) : null}
    </div>
  );
}

function DraftRow({
  listing,
  pending,
  onDelete,
}: {
  listing: Listing;
  pending: boolean;
  onDelete: () => void;
}) {
  const title = listing.title.trim() || "Untitled draft";
  return (
    <article
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center",
      )}
    >
      <div className="relative shrink-0 overflow-hidden rounded-lg bg-wash">
        {listing.imagePath ? (
          <img
            src={listing.imagePath}
            alt=""
            className="size-20 object-cover sm:size-24"
          />
        ) : (
          <div className="flex size-20 items-center justify-center text-xs text-subtle sm:size-24">
            No photo
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium tracking-wide text-muted uppercase">
          Draft
        </p>
        <h3 className="mt-0.5 font-display text-xl leading-snug">{title}</h3>
        <p className="mt-1 text-sm text-muted">
          {CATEGORY_META[listing.category].label} ·{" "}
          {listingDealBadge(listing)}
          {listing.summary.trim() ? ` · ${listing.summary}` : ""}
        </p>
        <p className="mt-1 text-xs text-subtle">
          Saved {timeAgo(listing.createdAt)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch">
        <Button asChild size="sm">
          <Link to="/post" search={{ draft: listing.id }}>
            Continue
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={onDelete}
        >
          {pending ? "Removing…" : "Delete"}
        </Button>
      </div>
    </article>
  );
}
