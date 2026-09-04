import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { ConnectPanel } from "@/components/connect-panel";
import { ExampleMark, isExampleListing } from "@/components/example-mark";
import { ListingGrid } from "@/components/listing-grid";
import { ListingPhotoEditor } from "@/components/listing-photo-editor";
import { ListingPrice } from "@/components/listing-price";
import { NoteForm } from "@/components/note-form";
import { PosterStatus } from "@/components/poster-status";
import { PriceEditor } from "@/components/price-editor";
import { InterestedButton } from "@/components/interested-button";
import { SaveButton } from "@/components/save-button";
import { Badge } from "@/components/ui/badge";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CATEGORY_META, DEAL_META } from "@/lib/catalog";
import { formatRegion, parseRegion } from "@/lib/geo";
import { getListing } from "@/lib/listings";
import { timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/listing/$slug")({
  loader: async ({ params }) => {
    try {
      const result = await getListing({ data: { slug: params.slug } });
      if (!result) throw notFound();
      return result;
    } catch (err) {
      if (err && typeof err === "object" && "isNotFound" in err) throw err;
      throw notFound();
    }
  },
  component: ListingPage,
});

function ListingPage() {
  const { listing, notes, similar } = Route.useLoaderData();
  const { user } = useCurrentUserState();
  const router = useRouter();
  const place = parseRegion(listing.region);
  const canEdit = Boolean(user && listing.userId && user.id === listing.userId);
  const tags = listing.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        to="/market"
        search={{ cat: listing.category }}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        {CATEGORY_META[listing.category].label}
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="relative overflow-hidden rounded-xl shadow-[var(--shadow-card)]">
            <img
              src={listing.imagePath}
              alt={listing.title}
              className="aspect-4/3 w-full object-cover"
            />
            {isExampleListing(listing) ? <ExampleMark className="top-3 left-3 text-xs" /> : null}
            {listing.decidingAt ? (
              <p className="absolute top-9 left-4 rounded-sm bg-alert px-2.5 py-1 text-sm font-bold tracking-wide text-primary-fg uppercase">
                Deciding
              </p>
            ) : null}
          </div>
          {canEdit ? (
            <ListingPhotoEditor
              listingId={listing.id}
              imagePath={listing.imagePath}
              onSaved={() => void router.invalidate()}
            />
          ) : null}
          <div className="mt-8">
            <h2 className="font-display text-2xl">The listing</h2>
            {listing.decidingAt ? (
              <p className="mt-3 text-base font-bold tracking-wide text-alert uppercase">
                Deciding
              </p>
            ) : null}
            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-fg/90">
              {listing.description}
            </p>
            {tags.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="muted">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <aside>
          <div className="rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-wrap gap-2">
              <Badge>{DEAL_META[listing.dealType].label}</Badge>
              <Badge variant="muted">
                {CATEGORY_META[listing.category].label}
              </Badge>
            </div>
            <h1 className="mt-4 font-display text-3xl leading-tight sm:text-4xl">
              {listing.title}
            </h1>
            <p className="mt-3 text-lg font-medium">
              <ListingPrice priceLabel={listing.priceLabel} note />
            </p>
            <p className="mt-1 text-sm text-muted">{listing.quantity}</p>
            {canEdit ? (
              <PriceEditor
                listingId={listing.id}
                priceLabel={listing.priceLabel}
                quantity={listing.quantity}
                onSaved={() => void router.invalidate()}
              />
            ) : null}
            {canEdit ? (
              <PosterStatus
                listingId={listing.id}
                deciding={Boolean(listing.decidingAt)}
              />
            ) : null}
            <p className="mt-4 flex items-start gap-1.5 text-sm text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" />
              <span>
                {place ? (
                  <Link
                    to="/market"
                    search={{ county: place.county, state: place.state }}
                    className="underline-offset-2 hover:text-fg hover:underline"
                  >
                    {formatRegion(listing.region)}
                  </Link>
                ) : (
                  formatRegion(listing.region)
                )}
                <br />
                <span className="text-subtle">
                  Street address stays off the listing. After you connect,
                  arrange pickup in private messages.
                </span>
              </span>
            </p>
            <p className="mt-3 text-xs text-subtle">
              Posted {timeAgo(listing.createdAt)}
            </p>
            <div className="mt-6">
              <div
                className={
                  listing.userId && !canEdit
                    ? "grid grid-cols-2 gap-2"
                    : "grid gap-2"
                }
              >
                <SaveButton
                  listingId={listing.id}
                  title={listing.title}
                  className="w-full"
                />
                {listing.userId && !canEdit ? (
                  <InterestedButton
                    ownerUserId={listing.userId}
                    listingId={listing.id}
                    className="w-full"
                  />
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-subtle">
                Favorite is a bookmark on this device — they are not notified.
                {listing.userId && !canEdit
                  ? " Interested sends the owner a request. Contact stays private until they Accept."
                  : null}
              </p>
            </div>
          </div>

          {listing.userId ? (
            <div className="mt-5">
              <ConnectPanel
                userId={listing.userId}
                listingId={listing.id}
                fallbackNote={listing.farmNote}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
              <p className="text-[12px] tracking-wide text-subtle uppercase">
                Posted by
              </p>
              <h2 className="mt-1 font-display text-2xl">A neighbor</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {listing.farmNote}
              </p>
              <p className="mt-3 text-sm text-subtle">
                Name and address stay off this card. County only.
              </p>
            </div>
          )}

          <div className="mt-5 rounded-xl bg-surface p-5 shadow-[var(--shadow-card)] sm:p-6">
            <h2 className="font-display text-2xl">Leave a note</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Public note — do not put a real name, address, phone, or email.
              After you connect, use the private message thread.
            </p>
            <NoteForm listingId={listing.id} />
            <div className="mt-8 space-y-4">
              {notes.length === 0 ? (
                <p className="text-sm text-subtle">No notes yet. Be first.</p>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="border-t border-border pt-4 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">{note.farmName.startsWith("@") ? note.farmName : "A neighbor"}</p>
                      <p className="text-xs text-subtle">
                        {timeAgo(note.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">
                      {note.body}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 ? (
        <section className="mt-16">
          <h2 className="font-display text-3xl">Also on this wall</h2>
          <ListingGrid listings={similar} className="mt-6" />
        </section>
      ) : null}
    </article>
  );
}
