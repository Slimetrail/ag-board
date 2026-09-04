import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { listListings } from "@/lib/listings";

export const Route = createFileRoute("/share")({
  loader: async () => {
    try {
      const listings = await listListings({ data: { dealType: "share" } });
      return { listings };
    } catch {
      return { listings: [] };
    }
  },
  component: SharePage,
});

function SharePage() {
  const { listings } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Free / share
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
        Equipment and materials, free to a neighbor.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Borrow the brush hog. Haul leftover panels. Take the tank that is in
        someone's way. The listing is free to post; the thing itself is
        free to take. Just a note and a truck.
      </p>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link to="/post">Give something away</Link>
        </Button>
      </div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <ViewToggle />
      </div>
      <ListingGrid listings={listings} className="mt-6" />
    </div>
  );
}
