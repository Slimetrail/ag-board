import { useEffect, useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { useBoardStore } from "@/lib/board-store";
import type { Listing } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function ViewToggle({ className }: { className?: string }) {
  const view = useBoardStore((s) => s.boardView);
  const setBoardView = useBoardStore((s) => s.setBoardView);

  return (
    <div
      className={cn(
        "inline-flex rounded-md border border-border bg-surface p-0.5",
        className,
      )}
      role="group"
      aria-label="Board view"
    >
      <button
        type="button"
        aria-pressed={view === "tile"}
        onClick={() => setBoardView("tile")}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-sm font-medium",
          view === "tile" ? "bg-wash text-fg" : "text-muted hover:text-fg",
        )}
      >
        <LayoutGrid className="size-4" />
        Tiles
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        onClick={() => setBoardView("list")}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-sm font-medium",
          view === "list" ? "bg-wash text-fg" : "text-muted hover:text-fg",
        )}
      >
        <List className="size-4" />
        List
      </button>
    </div>
  );
}

export function ListingGrid({
  listings,
  className,
}: {
  listings: Listing[];
  className?: string;
}) {
  const view = useBoardStore((s) => s.boardView);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const resolved = mounted ? view : "tile";
  return (
    <div
      className={cn(
        resolved === "list"
          ? "grid gap-3"
          : "grid gap-5 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} variant={resolved} />
      ))}
    </div>
  );
}
