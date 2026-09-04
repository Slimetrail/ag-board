import { Link } from "@tanstack/react-router";
import { CATEGORIES, CATEGORY_META, type Category } from "@/lib/catalog";
import type { CategoryCount } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function CategoryTiles({
  counts,
  variant = "full",
  className,
}: {
  counts: CategoryCount[];
  variant?: "full" | "compact";
  className?: string;
}) {
  const countMap = Object.fromEntries(
    counts.map((row) => [row.category, row]),
  ) as Partial<Record<Category, CategoryCount>>;

  return (
    <div
      className={cn(
        variant === "compact"
          ? "grid gap-3 sm:grid-cols-3 lg:grid-cols-7"
          : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {CATEGORIES.map((cat) => {
        const meta = CATEGORY_META[cat];
        const row = countMap[cat];
        const cover = row?.coverImage ?? meta.image;
        const count = row?.count ?? 0;
        return (
          <Link
            key={cat}
            to="/market"
            search={{ cat }}
            className="group overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
          >
            <div
              className={cn(
                "relative overflow-hidden",
                variant === "compact" ? "h-24" : "h-36",
              )}
            >
              <img
                src={cover}
                alt=""
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </div>
            <div className={variant === "compact" ? "p-3" : "p-4"}>
              {variant === "full" ? (
                <p className="text-[12px] tracking-wide text-subtle uppercase">
                  {meta.kicker}
                </p>
              ) : null}
              <h3
                className={cn(
                  "font-display",
                  variant === "compact" ? "text-lg" : "mt-1 text-2xl",
                )}
              >
                {meta.label}
              </h3>
              {variant === "full" ? (
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {meta.blurb}
                </p>
              ) : null}
              <p className="mt-2 text-xs tabular-nums text-subtle">
                {count} on the board
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
