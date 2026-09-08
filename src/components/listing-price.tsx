import { useScResident } from "@/lib/sc-resident";
import {
  listingPriceDisplay,
  scResidentSeesFree,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";

export function ListingPrice({
  dealType,
  priceLabel,
  className,
  note = false,
}: {
  dealType: string;
  priceLabel: string;
  className?: string;
  note?: boolean;
}) {
  const sc = useScResident();
  const listing = { dealType, priceLabel };
  const forcedFree = sc && scResidentSeesFree(listing);
  return (
    <span className={cn(forcedFree ? "text-fg" : undefined, className)}>
      {listingPriceDisplay(listing, sc)}
      {forcedFree && note ? (
        <span className="mt-1 block text-xs font-normal text-subtle">
          Always free in South Carolina
        </span>
      ) : null}
    </span>
  );
}
