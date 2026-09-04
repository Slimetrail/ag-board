import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { listListings } from "@/lib/listings";

export const Route = createFileRoute("/needs")({
  loader: async () => {
    try {
      const listings = await listListings({ data: { dealType: "seeking" } });
      return { listings };
    } catch {
      return { listings: [] };
    }
  },
  component: NeedsPage,
});

function NeedsPage() {
  const { listings } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Needs board
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
        What the county is short on.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Post the request — hay, a doeling, a weekend of fence, a welder who
        will come to the yard. Add a photo if you have one. A neighbor with
        extra can fill it.
      </p>
      <div className="mt-6">
        <Button asChild>
          <Link to="/post" search={{ deal: "seeking" }}>
            Post a need
          </Link>
        </Button>
      </div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <ViewToggle />
      </div>
      {listings.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No open needs right now.</p>
      ) : (
        <ListingGrid listings={listings} className="mt-6" />
      )}
    </div>
  );
}
