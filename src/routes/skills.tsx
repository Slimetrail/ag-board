import { createFileRoute, Link } from "@tanstack/react-router";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { listListings } from "@/lib/listings";

export const Route = createFileRoute("/skills")({
  loader: async () => {
    try {
      const listings = await listListings({ data: { category: "skills" } });
      return { listings };
    } catch {
      return { listings: [] };
    }
  },
  component: SkillsPage,
});

function SkillsPage() {
  const { listings } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Hands & know-how
      </p>
      <h1 className="mt-2 max-w-2xl font-display text-4xl sm:text-5xl">
        Hire the neighbor who already knows how.
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
        Farrier loops, fence crews, orchard days, and the mechanic who will
        come to the yard. Write out what you actually do — or what you need
        done. Day rates and trades.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/post" search={{ cat: "skills", deal: "offered" }}>
            Offer a skill
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/post" search={{ cat: "skills", deal: "seeking" }}>
            Need a skill
          </Link>
        </Button>
      </div>
      <div className="mt-10 flex items-center justify-between gap-3">
        <ViewToggle />
      </div>
      <ListingGrid listings={listings} className="mt-6" />
    </div>
  );
}
