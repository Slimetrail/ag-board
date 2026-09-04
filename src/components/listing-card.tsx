import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { ExampleMark, isExampleListing } from "@/components/example-mark";
import { ListingPrice } from "@/components/listing-price";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_META, listingDealBadge } from "@/lib/catalog";
import { formatRegion } from "@/lib/geo";
import type { Listing } from "@/lib/listings";
import { cn, timeAgo } from "@/lib/utils";

export function ListingCard({
  listing,
  className,
  variant = "tile",
}: {
  listing: Listing;
  className?: string;
  variant?: "tile" | "list";
}) {
  const blurb = listing.description || listing.summary;
  const deciding = Boolean(listing.decidingAt);
  const example = isExampleListing(listing);

  if (variant === "list") {
    return (
      <Link
        to="/listing/$slug"
        params={{ slug: listing.slug }}
        className={cn(
          "group flex gap-4 overflow-hidden rounded-xl bg-surface p-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] sm:p-4",
          className,
        )}
      >
        <div className="relative shrink-0">
          <img
            src={listing.imagePath}
            alt=""
            className="size-20 rounded-lg object-cover sm:size-24"
          />
          {example ? <ExampleMark className="top-1 left-1.5" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-xl leading-snug text-fg">
              {listing.title}
            </h3>
            <Badge variant="outline">{listingDealBadge(listing)}</Badge>
          </div>
          {deciding ? (
            <p className="mt-1 text-sm font-bold tracking-wide text-alert uppercase">
              Deciding
            </p>
          ) : null}
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">
            {blurb}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
            <span className="font-medium text-fg">
              <ListingPrice priceLabel={listing.priceLabel} />
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" />
              {formatRegion(listing.region)}
            </span>
            <span>{timeAgo(listing.createdAt)}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/listing/$slug"
      params={{ slug: listing.slug }}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
        className,
      )}
    >
      <div className="relative overflow-hidden">
        <img
          src={listing.imagePath}
          alt=""
          className="aspect-4/3 w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
        />
        {example ? <ExampleMark /> : null}
        {deciding ? (
          <p className="absolute top-7 left-3 rounded-sm bg-alert px-2 py-1 text-xs font-bold tracking-wide text-primary-fg uppercase">
            Deciding
          </p>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
          <Badge variant="outline">{listingDealBadge(listing)}</Badge>
          <span className="rounded-full bg-fg/70 px-2 py-0.5 text-[11px] font-medium text-primary-fg backdrop-blur-sm">
            {CATEGORY_META[listing.category].label}
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="font-display text-xl leading-snug text-fg">
          {listing.title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-muted">
          {blurb}
        </p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <div>
            <p className="text-sm font-medium text-fg">
              <ListingPrice priceLabel={listing.priceLabel} />
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-subtle">
              <MapPin className="size-3" />
              {formatRegion(listing.region)}
            </p>
          </div>
          <p className="text-xs text-subtle">{timeAgo(listing.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}
