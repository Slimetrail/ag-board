import { listingThumbSrc } from "@/lib/interest-notify";
import { cn } from "@/lib/utils";

/** Tiny square of a listing photo — matches listing-card tiles, not FarmAvatar. */
export function ListingThumb({
  src,
  title,
  className,
}: {
  src?: string | null;
  title: string;
  className?: string;
}) {
  const photo = listingThumbSrc(src);
  return (
    <span
      className={cn(
        "relative block size-11 shrink-0 overflow-hidden rounded-lg bg-wash",
        className,
      )}
    >
      {photo ? (
        <img src={photo} alt="" className="size-full object-cover" />
      ) : (
        <span
          role="img"
          aria-label={title || "Listing"}
          className="grid size-full place-items-center font-display text-[0.65rem] font-semibold text-subtle uppercase"
        >
          {(title.trim().slice(0, 2) || "?").toUpperCase()}
        </span>
      )}
    </span>
  );
}
