import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, listingDealBadge } from "@/lib/catalog";
import type { Listing } from "@/lib/listings";
import { cn, timeAgo } from "@/lib/utils";

export function DraftRow({
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
