import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function NeighborRating({
  average,
  count,
  className,
}: {
  average: number | null;
  count: number;
  className?: string;
}) {
  if (count === 0) {
    return (
      <p className={cn("text-sm text-subtle", className)}>No ratings yet</p>
    );
  }
  return (
    <p className={cn("text-sm text-muted", className)}>
      <span className="font-medium text-fg">{average?.toFixed(1)}</span>
      {" "}
      <span aria-hidden>★</span>
      {" "}
      average · {count} {count === 1 ? "rating" : "ratings"}
    </p>
  );
}

export function StarPick({
  value,
  onPick,
  disabled,
}: {
  value: number | null;
  onPick?: (stars: number) => void;
  disabled?: boolean;
}) {
  const shown = value ?? 0;
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((stars) => {
        const filled = stars <= shown;
        return (
          <button
            key={stars}
            type="button"
            disabled={disabled || !onPick}
            onClick={() => onPick?.(stars)}
            className={cn(
              "rounded-md p-1",
              onPick && !disabled ? "hover:bg-wash" : "cursor-default",
            )}
            aria-label={`${stars} star${stars === 1 ? "" : "s"}`}
            aria-pressed={filled}
          >
            <Star
              className={cn(
                "size-5",
                filled ? "fill-fg text-fg" : "text-subtle",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
