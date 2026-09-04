import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, X } from "lucide-react";
import { CountySelect } from "@/components/county-select";
import { ListingGrid, ViewToggle } from "@/components/listing-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CATEGORIES,
  CATEGORY_META,
  DEAL_META,
  DEAL_TYPES,
  type Category,
  type DealType,
} from "@/lib/catalog";
import { isCountyInState, isStateCode } from "@/lib/geo";
import { listListings } from "@/lib/listings";
import { cn } from "@/lib/utils";

export type MarketSearch = {
  q?: string;
  cat?: Category;
  deal?: DealType;
  county?: string;
  state?: string;
};

export const Route = createFileRoute("/market")({
  validateSearch: (search: Record<string, unknown>): MarketSearch => {
    const stateRaw = String(search.state ?? "SC").toUpperCase();
    const state = isStateCode(stateRaw) ? stateRaw : "SC";
    const county = String(search.county ?? "");
    return {
      q: typeof search.q === "string" && search.q.length ? search.q : undefined,
      cat: CATEGORIES.includes(search.cat as Category)
        ? (search.cat as Category)
        : undefined,
      deal: DEAL_TYPES.includes(search.deal as DealType)
        ? (search.deal as DealType)
        : undefined,
      county: county && isCountyInState(county, state) ? county : undefined,
      state: state !== "SC" ? state : undefined,
    };
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    try {
      const listings = await listListings({
        data: {
          q: deps.q,
          category: deps.cat,
          dealType: deps.deal,
          county: deps.county,
          state: deps.state ?? "SC",
        },
      });
      return { listings };
    } catch {
      return { listings: [] };
    }
  },
  component: MarketPage,
});

function MarketPage() {
  const { listings } = Route.useLoaderData();
  const search = Route.useSearch();
  const [draft, setDraft] = useState(search.q ?? "");
  const navigate = Route.useNavigate();

  const heading = search.county
    ? `${search.county} County, ${search.state ?? "SC"}`
    : search.cat
      ? CATEGORY_META[search.cat].label
      : search.q
        ? `Results for “${search.q}”`
        : "The board";

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Find by county
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{heading}</h1>
      <p className="mt-3 max-w-xl text-base text-muted">
        {search.county
          ? `What's posted in ${search.county} County. Narrow by kind or how it moves.`
          : "Free to use. Pick a county to see what's close."}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,16rem)_1fr_auto] sm:items-end">
        <div className="grid gap-1.5">
          <label htmlFor="county-filter" className="text-sm font-medium text-fg">
            County
          </label>
          <CountySelect
            id="county-filter"
            allowAll
            value={search.county ?? ""}
            state={search.state ?? "SC"}
            onChange={(value, state) =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  county: value || undefined,
                  state: state !== "SC" ? state : undefined,
                }),
              })
            }
          />
        </div>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void navigate({
              search: (prev) => ({
                ...prev,
                q: draft.trim() || undefined,
              }),
            });
          }}
        >
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Search hay, goats, farrier…"
              className="pl-10"
              aria-label="Search the board"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip
          active={!search.cat}
          onClick={() =>
            void navigate({ search: (prev) => ({ ...prev, cat: undefined }) })
          }
        >
          All
        </FilterChip>
        {CATEGORIES.map((cat) => (
          <FilterChip
            key={cat}
            active={search.cat === cat}
            onClick={() =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  cat: prev.cat === cat ? undefined : cat,
                }),
              })
            }
          >
            {CATEGORY_META[cat].label}
          </FilterChip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {DEAL_TYPES.map((deal) => (
          <FilterChip
            key={deal}
            active={search.deal === deal}
            onClick={() =>
              void navigate({
                search: (prev) => ({
                  ...prev,
                  deal: prev.deal === deal ? undefined : deal,
                }),
              })
            }
          >
            {DEAL_META[deal].short}
          </FilterChip>
        ))}
        {(search.q || search.cat || search.deal || search.county) && (
          <Link
            to="/market"
            search={{}}
            className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-sm text-muted hover:text-fg"
          >
            <X className="size-3.5" />
            Clear
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <div className="mt-16 rounded-xl border border-dashed border-border bg-surface px-6 py-16 text-center">
          <h2 className="font-display text-2xl">
            {search.county
              ? `Nothing in ${search.county} County yet`
              : "Nothing on this nail"}
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            {search.county
              ? "Be the first in this county, or pick a neighboring one."
              : "No listings match those filters. Try a wider search, or post what you have."}
          </p>
          <Button asChild className="mt-6">
            <Link to="/post">Post a listing</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm tabular-nums text-subtle">
              {listings.length} listing{listings.length === 1 ? "" : "s"}
              {search.county ? ` in ${search.county} County` : ""}
            </p>
            <ViewToggle />
          </div>
          <ListingGrid listings={listings} className="mt-5" />
        </>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-full px-3.5 text-sm font-medium transition-colors duration-150",
        active
          ? "bg-primary text-primary-fg"
          : "bg-surface text-muted shadow-[var(--shadow-card)] hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
