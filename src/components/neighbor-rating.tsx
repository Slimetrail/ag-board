import { useEffect, useId, useRef, useState } from "react";
import { Star } from "lucide-react";
import {
  hasCompleteCategoryScores,
  RATING_CATEGORIES,
  RATING_CATEGORY_INFO,
  RATING_CATEGORY_LABELS,
  shouldDisplayNeighborRating,
  type CategoryAverages,
  type CategoryScores,
  type PartialCategoryScores,
  type RatingCategory,
} from "@/lib/connect-helpers";
import { cn } from "@/lib/utils";

export function NeighborRating({
  average,
  count,
  className,
  forSelf = false,
  categoryAverages,
}: {
  average: number | null;
  count: number;
  className?: string;
  /** Owner viewing their own stats can still see a hidden public score. */
  forSelf?: boolean;
  categoryAverages?: CategoryAverages;
}) {
  if (count === 0) {
    return (
      <p className={cn("text-sm text-subtle", className)}>No ratings yet</p>
    );
  }
  if (forSelf) {
    return (
      <div className={cn("grid gap-1 text-sm text-muted", className)}>
        {RATING_CATEGORIES.map((category) => {
          const value = categoryAverages?.[category];
          return (
            <p key={category}>
              <span className="font-medium text-fg">
                {RATING_CATEGORY_LABELS[category]}
              </span>
              {" "}
              <span className="font-medium text-fg">
                {value == null ? "—" : value.toFixed(1)}
              </span>
              {" "}
              <span aria-hidden>★</span>
            </p>
          );
        })}
        <p>
          <span className="font-medium text-fg">{average?.toFixed(1)}</span>
          {" "}
          <span aria-hidden>★</span>
          {" "}
          overall · {count} {count === 1 ? "rating" : "ratings"}
        </p>
      </div>
    );
  }
  if (!shouldDisplayNeighborRating(average, count)) {
    return null;
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
  label,
}: {
  value: number | null;
  onPick?: (stars: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const shown = value ?? 0;
  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={label ? `${label} star rating` : "Star rating"}
    >
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
            aria-label={
              label
                ? `${stars} star${stars === 1 ? "" : "s"} for ${label}`
                : `${stars} star${stars === 1 ? "" : "s"}`
            }
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

function RatingInfoButton({
  category,
}: {
  category: RatingCategory;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();
  const label = RATING_CATEGORY_LABELS[category];
  const copy = RATING_CATEGORY_INFO[category];

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent | PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <span ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        className="inline-flex size-5 items-center justify-center rounded-full border border-border text-[11px] font-medium leading-none text-muted hover:bg-wash hover:text-fg"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={tipId}
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      {open ? (
        <span
          id={tipId}
          role="tooltip"
          className="absolute top-full left-0 z-20 mt-1 w-64 rounded-lg bg-surface p-3 text-left text-[13px] leading-relaxed text-fg shadow-[var(--shadow-card)]"
        >
          {copy}
        </span>
      ) : null}
    </span>
  );
}

export function CategoryStarPick({
  scores,
  onChange,
  disabled,
}: {
  scores: PartialCategoryScores;
  onChange: (next: PartialCategoryScores) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {RATING_CATEGORIES.map((category) => {
        const label = RATING_CATEGORY_LABELS[category];
        return (
          <div key={category} className="grid gap-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-fg">{label}</span>
              <RatingInfoButton category={category} />
            </div>
            <StarPick
              label={label}
              value={scores[category]}
              disabled={disabled}
              onPick={(stars) =>
                onChange({
                  ...scores,
                  [category]: stars,
                })
              }
            />
          </div>
        );
      })}
    </div>
  );
}

export function canSubmitCategoryRating(scores: PartialCategoryScores): boolean {
  return hasCompleteCategoryScores(scores);
}

export function formatSubmittedRating(scores: CategoryScores): string {
  return RATING_CATEGORIES.map(
    (category) =>
      `${RATING_CATEGORY_LABELS[category]} ${scores[category]}`,
  ).join(" · ");
}
