import { cn } from "@/lib/utils";

export function isExampleListing(listing: { userId: string | null }) {
  return !listing.userId;
}

export function ExampleMark({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "pointer-events-none absolute top-2 left-2 z-10 text-[10px] font-medium tracking-[0.2em] text-primary-fg uppercase",
        className,
      )}
      style={{ textShadow: "0 1px 2px rgba(28, 24, 20, 0.85)" }}
    >
      Example
    </p>
  );
}
