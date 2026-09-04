import { useScResident } from "@/lib/sc-resident";
import { cn } from "@/lib/utils";

export function ListingPrice({
  priceLabel,
  className,
  note = false,
}: {
  priceLabel: string;
  className?: string;
  note?: boolean;
}) {
  const sc = useScResident();
  if (sc) {
    return (
      <span className={cn("text-fg", className)}>
        Free
        {note ? (
          <span className="mt-1 block text-xs font-normal text-subtle">
            Always free in South Carolina
          </span>
        ) : null}
      </span>
    );
  }
  return <span className={className}>{priceLabel}</span>;
}
