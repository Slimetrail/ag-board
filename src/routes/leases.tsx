import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { listListings } from "@/lib/listings";

export const Route = createFileRoute("/leases")({
  loader: async () => {
    try {
      const listings = await listListings({
        data: { categories: ["land", "hunting"] },
      });
      return { listings };
    } catch {
      return { listings: [] };
    }
  },
  component: LeasesPage,
});

function LeasesPage() {
  const { listings } = Route.useLoaderData();
  const farm = listings.filter((item) => item.category === "land");
  const hunt = listings.filter((item) => item.category === "hunting");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Ground
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
        Lease it to farm, or lease it to hunt.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Cash rent cropland, pasture for a season, timber by the hunter. Walk
        it first. Notes stay on the listing.
      </p>
      <div className="mt-6">
        <Button asChild variant="outline">
          <Link to="/post">Post a lease</Link>
        </Button>
      </div>

      <div className="mt-10 flex items-center justify-end">
        <ViewToggle />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-3xl">Farm leases</h2>
        <p className="mt-2 text-sm text-muted">
          Cropland and pasture. You plant, graze, or both.
        </p>
        <ListingGrid listings={farm} className="mt-6" />
      </section>

      <section className="mt-16">
        <h2 className="font-display text-3xl">Hunting leases</h2>
        <p className="mt-2 text-sm text-muted">
          Season agreements. Ask about other hunters and how you get in.
        </p>
        <ListingGrid listings={hunt} className="mt-6" />
      </section>
    </div>
  );
}
