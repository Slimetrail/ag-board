import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import { CountySelect } from "@/components/county-select";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { useBoardStore } from "@/lib/board-store";
import { CATEGORIES, CATEGORY_META } from "@/lib/catalog";
import { isCountyInState } from "@/lib/geo";
import { categoryCounts, listListings } from "@/lib/listings";
import { TUTORIALS } from "@/lib/tutorials";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const [featured, counts, shared, leases, needs] = await Promise.all([
        listListings({ data: { featured: true } }),
        categoryCounts(),
        listListings({ data: { dealType: "share" } }),
        listListings({ data: { categories: ["land", "hunting"] } }),
        listListings({ data: { dealType: "seeking" } }),
      ]);
      return { featured, counts, shared, leases, needs };
    } catch {
      return {
        featured: [],
        counts: [],
        shared: [],
        leases: [],
        needs: [],
      };
    }
  },
  component: Home,
});

function Home() {
  const { featured, counts, shared, leases, needs } = Route.useLoaderData();
  const countMap = Object.fromEntries(
    counts.map((row) => [row.category, row]),
  );

  return (
    <div>
      <section className="relative isolate min-h-[78svh] overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="Borage and herbs in a raised garden bed"
          className="absolute inset-0 size-full object-cover object-[center_70%]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-fg/80 via-fg/35 to-fg/20" />
        <div className="relative mx-auto flex min-h-[78svh] max-w-6xl flex-col justify-end px-4 pb-14 pt-28 sm:px-6 sm:pb-20">
          <p className="text-[13px] font-medium tracking-[0.18em] text-primary-fg/80 uppercase">
            Ag · South Carolina · Free to use
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.6rem] leading-[1.05] text-primary-fg sm:text-6xl">
            See a need. Fill a need.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-primary-fg/80 sm:text-lg">
            Free to post, free to browse. A South Carolina board, found by
            county — no dues, no cut, no account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-surface text-fg hover:bg-bg">
              <Link to="/market">
                Browse the state
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-fg/30 bg-fg/20 text-primary-fg hover:bg-fg/35"
            >
              <Link to="/share">See what's free</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface/70">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
            Forty-six counties
          </p>
          <h2 className="mt-2 font-display text-3xl sm:text-4xl">
            Find your county first
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Listings stay in the county they were posted from. Pick yours and
            see what the neighbors have extra.
          </p>
          <CountyFinder />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
          Seven corners
        </p>
        <h2 className="mt-2 font-display text-3xl sm:text-4xl">
          What South Carolina trades
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            return (
              <Link
                key={cat}
                to="/market"
                search={{ cat }}
                className="group overflow-hidden rounded-xl bg-surface shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={countMap[cat]?.coverImage ?? meta.image}
                    alt=""
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="p-4">
                  <p className="text-[12px] tracking-wide text-subtle uppercase">
                    {meta.kicker}
                  </p>
                  <h3 className="mt-1 font-display text-2xl">{meta.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {meta.blurb}
                  </p>
                  <p className="mt-3 text-xs tabular-nums text-subtle">
                    {countMap[cat]?.count ?? 0} on the board
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border bg-surface/60">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3 md:py-16">
          {[
            {
              step: "01",
              title: "See a need",
              body: "A neighbor is short on hay, a goat, a weekend of fence, or ground to work.",
            },
            {
              step: "02",
              title: "Fill a need",
              body: "Post what's extra — sell, trade, give it away, or lease the acres.",
            },
            {
              step: "03",
              title: "Meet at the gate",
              body: "Leave a note on the listing. Settle cash, hay, or labor in person.",
            },
          ].map((item) => (
            <div key={item.step}>
              <p className="font-display text-sm tracking-[0.14em] text-muted">
                {item.step}
              </p>
              <h3 className="mt-3 font-display text-2xl">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto max-w-6xl border-t border-border px-4 py-8 text-sm text-muted sm:px-6">
          The board itself is free. No listing fees, no membership, no cut of
          the trade.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
              Free / share
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Take it if you haul it
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/share">
              All free listings
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="mt-8 flex justify-end">
          <ViewToggle />
        </div>
        <ListingGrid listings={shared.slice(0, 3)} className="mt-6" />
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
                Needs board
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                What neighbors are asking for
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/needs">
                All needs
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <ListingGrid listings={needs.slice(0, 3)} className="mt-8" />
        </div>
      </section>

      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
                This week
              </p>
              <h2 className="mt-2 font-display text-3xl sm:text-4xl">
                Pinned to the top of the board
              </h2>
            </div>
            <Button asChild variant="ghost" className="hidden sm:inline-flex">
              <Link to="/market">
                All listings
                <ArrowRight />
              </Link>
            </Button>
          </div>
          <ListingGrid listings={featured.slice(0, 6)} className="mt-8" />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
              Ground
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Farm it or hunt it
            </h2>
          </div>
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/leases">
              All leases
              <ArrowRight />
            </Link>
          </Button>
        </div>
        <ListingGrid listings={leases.slice(0, 3)} className="mt-8" />
      </section>

      <section className="border-t border-border bg-primary px-4 py-16 text-primary-fg sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-[13px] tracking-[0.16em] text-primary-fg/70 uppercase">
            Learn
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl sm:text-4xl">
            Short films from the people who posted.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-primary-fg/75">
            Fence, hay, livestock, and walking a lease — the kind of thing a
            neighbor shows you once in the yard.
          </p>
          <Button asChild className="mt-6 bg-surface text-fg hover:bg-bg">
            <Link to="/learn">
              Watch the tutorials
              <ArrowRight />
            </Link>
          </Button>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TUTORIALS.map((item) => (
              <Link
                key={item.slug}
                to="/learn/$slug"
                params={{ slug: item.slug }}
                className="group overflow-hidden rounded-xl bg-fg/20 shadow-[var(--shadow-card)]"
              >
                <div className="relative">
                  <img
                    src={item.posterPath}
                    alt=""
                    className="aspect-video w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-surface text-fg">
                    <Play className="size-4 fill-current" />
                  </span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] tracking-wide text-primary-fg/60 uppercase">
                    {item.topic} · {item.duration}
                  </p>
                  <h3 className="mt-1 font-display text-xl">{item.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function CountyFinder() {
  const navigate = useNavigate();
  const saved = useBoardStore((s) => s.homeCounty);
  const savedState = useBoardStore((s) => s.homeState);
  const setHomeCounty = useBoardStore((s) => s.setHomeCounty);
  const [county, setCounty] = useState(saved);
  const [state, setState] = useState(savedState || "SC");

  return (
    <form
      className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isCountyInState(county, state)) return;
        setHomeCounty(county, state);
        void navigate({
          to: "/market",
          search: { county, state: state !== "SC" ? state : undefined },
        });
      }}
    >
      <div className="min-w-0 flex-1">
        <label htmlFor="home-county" className="sr-only">
          County
        </label>
        <CountySelect
          id="home-county"
          required
          value={county}
          state={state}
          onChange={(value, nextState) => {
            setCounty(value);
            setState(nextState);
          }}
        />
      </div>
      <Button type="submit" size="lg">
        See this county
        <ArrowRight />
      </Button>
    </form>
  );
}
