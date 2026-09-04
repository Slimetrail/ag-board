import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/lib/board-store";
import { listListings, type Listing } from "@/lib/listings";

export const Route = createFileRoute("/saved")({
  component: SavedPage,
});

function SavedPage() {
  const savedIds = useBoardStore((s) => s.savedIds);
  const postedIds = useBoardStore((s) => s.postedIds);
  const [saved, setSaved] = useState<Listing[] | null>(null);
  const [posted, setPosted] = useState<Listing[] | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      const [savedRows, postedRows] = await Promise.all([
        savedIds.length
          ? listListings({ data: { ids: savedIds } })
          : Promise.resolve([] as Listing[]),
        postedIds.length
          ? listListings({ data: { ids: postedIds } })
          : Promise.resolve([] as Listing[]),
      ]);
      if (!live) return;
      setSaved(savedRows);
      setPosted(postedRows);
    }
    void load();
    return () => {
      live = false;
    };
  }, [savedIds, postedIds]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        On your nail
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">Pinned listings</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        Things you marked to come back to. Kept on this device, not on a
        profile.
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
