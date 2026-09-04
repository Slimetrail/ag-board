import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { CountySelect } from "@/components/county-select";
import { PhotoPicker } from "@/components/photo-picker";
import { RequireUse } from "@/components/require-use";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useBoardStore } from "@/lib/board-store";
import {
  CATEGORIES,
  CATEGORY_META,
  DEAL_META,
  DEAL_TYPES,
  type Category,
  type DealType,
} from "@/lib/catalog";
import { isCountyInState } from "@/lib/geo";
import {
  EMPTY_LISTING_FORM,
  isListingFormDirty,
  listingFormFromListing,
  type ListingFormState,
} from "@/lib/listing-draft";
import { createListing, getOwnDraft, saveListingDraft } from "@/lib/listings";
import { ensureOwnProfile } from "@/lib/profiles";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/post")({
  validateSearch: (search: Record<string, unknown>) => {
    const next: { cat?: Category; deal?: DealType; draft?: number } = {};
    if (CATEGORIES.includes(search.cat as Category)) {
      next.cat = search.cat as Category;
    }
    if (DEAL_TYPES.includes(search.deal as DealType)) {
      next.deal = search.deal as DealType;
    }
    const draftRaw = search.draft;
    const draft =
      typeof draftRaw === "number"
        ? draftRaw
        : typeof draftRaw === "string" && /^\d+$/.test(draftRaw)
          ? Number(draftRaw)
          : NaN;
    if (Number.isInteger(draft) && draft > 0) {
      next.draft = draft;
    }
    return next;
  },
  component: PostPage,
});

function copyFor(category: Category, dealType: DealType) {
  if (dealType === "seeking") {
    return {
      heading: "Post a need",
      blurb:
        "Describe the request. Add a photo of what you're after if you have one.",
      title: "Need first-cut hay, square bales",
      summary: "Looking for about 40 dry bales this week.",
      story:
        "What you need, when you need it, and what you can offer in return…",
      photo: "A photo of what you need — take it on your phone or pick a file. No stock shots.",
      submit: "Post this need",
    };
  }
  if (category === "skills" || dealType === "offered") {
    return {
      heading: "Offer a skill",
      blurb:
        "Describe the work you can do — farrier, fence, welding, pruning, a mechanic who comes to the yard.",
      title: "Fence stretching, by the day",
      summary: "H-braces, woven wire, and a crew that shows up.",
      story:
        "What you do, how far you'll travel, day rate or trade, and what to bring…",
      photo: "A photo of your work or tools — take it on your phone or pick a file. No stock shots.",
      submit: "Offer this skill",
    };
  }
  return {
    heading: "Fill a need from your place",
    blurb:
      "No listing fee. Animals, harvest, tools, leftover materials, a skill, or a lease. Add a photo of the actual thing.",
    title: "First-cut timothy, square bales",
    summary: "Eighty dry bales left in the hay barn.",
    story:
      "When it was cut, how it was stored, what you want in return…",
    photo: "A photo of the actual thing — take it on your phone or pick a file. No stock shots.",
    submit: "Put it on the board",
  };
}

function freshForm(
  search: { cat?: Category; deal?: DealType },
  homeCounty: string,
  homeState: string,
): ListingFormState {
  return {
    ...EMPTY_LISTING_FORM,
    category: search.cat ?? "materials",
    dealType: search.deal ?? "sale",
    county: homeCounty,
    state: homeState || "SC",
  };
}

function PostPage() {
  return (
    <RequireUse reason="Posting a listing takes an account — and you agree the app is not a party to the deal.">
      <PostForm />
    </RequireUse>
  );
}

function PostForm() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const homeCounty = useBoardStore((s) => s.homeCounty);
  const homeState = useBoardStore((s) => s.homeState);
  const setHomeCounty = useBoardStore((s) => s.setHomeCounty);
  const markPosted = useBoardStore((s) => s.markPosted);
  const setListingForm = useBoardStore((s) => s.setListingForm);
  const clearListingForm = useBoardStore((s) => s.clearListingForm);
  const [form, setForm] = useState<ListingFormState>(() =>
    freshForm(search, homeCounty, homeState),
  );
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState<"publish" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const copy = copyFor(form.category, form.dealType);

  useEffect(() => {
    let live = true;
    async function boot() {
      if (search.draft) {
        try {
          const draft = await getOwnDraft({ data: { id: search.draft } });
          if (!live) return;
          if (draft) {
            const next = listingFormFromListing(draft);
            setForm(next);
            setListingForm(next);
          } else {
            setError("That draft is gone.");
          }
        } catch {
          if (live) setError("Could not open that draft.");
        }
      } else {
        const stored = useBoardStore.getState().listingForm;
        if (stored && isListingFormDirty(stored)) {
          setForm(stored);
        }
      }
      if (live) setReady(true);
    }
    void boot();
    return () => {
      live = false;
    };
  }, [search.draft, setListingForm]);

  useEffect(() => {
    if (!ready) return;
    setListingForm(form);
  }, [form, ready, setListingForm]);

  function patch(partial: Partial<ListingFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function persistDraft() {
    const listing = await saveListingDraft({
      data: {
        draftId: form.draftId ?? undefined,
        category: form.category,
        dealType: form.dealType,
        title: form.title,
        summary: form.summary,
        description: form.description,
        priceLabel: form.priceLabel,
        quantity: form.quantity,
        county: form.county,
        state: form.state,
        farmNote: form.farmNote,
        imagePath: form.imagePath,
        tags: form.tags,
      },
    });
    const next = listingFormFromListing(listing);
    setForm(next);
    setListingForm(next);
    setHomeCounty(form.county || homeCounty, form.state);
    return listing;
  }

  if (!ready) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-muted">
        Opening your listing…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        {form.draftId ? "Draft" : "Free to post"}
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{copy.heading}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        {copy.blurb}
      </p>
      {form.draftId ? (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          This stays off the board until you put it up.{" "}
          <Link
            to="/saved"
            className="underline-offset-2 hover:text-fg hover:underline"
          >
            Your drafts
          </Link>
        </p>
      ) : null}

      <form
        className="mt-10 grid gap-8"
        onSubmit={async (event) => {
          event.preventDefault();
          event.stopPropagation();
          setPending("publish");
          setError(null);
          if (!isCountyInState(form.county, form.state)) {
            setError("Pick the county this listing is in.");
            setPending(null);
            return;
          }
          if (!form.imagePath) {
            setError("Add a photo of what you're posting.");
            setPending(null);
            return;
          }
          try {
            const profile = await ensureOwnProfile();
            const listing = await createListing({
              data: {
                draftId: form.draftId ?? undefined,
                category: form.category,
                dealType: form.dealType,
                title: form.title,
                summary: form.summary,
                description: form.description,
                priceLabel: form.priceLabel,
                quantity: form.quantity,
                location: `${form.county} County`,
                county: form.county,
                state: form.state,
                farmName: `@${profile.username}`,
                farmNote: form.farmNote,
                imagePath: form.imagePath,
                tags: form.tags,
              },
            });
            markPosted(listing.id);
            setHomeCounty(form.county, form.state);
            clearListingForm();
            toast("Posted to the board");
            await navigate({
              to: "/listing/$slug",
              params: { slug: listing.slug },
            });
          } catch {
            setError(
              "Check the fields — titles need a few words, and the note should read like a real listing.",
            );
          } finally {
            setPending(null);
          }
        }}
      >
        <fieldset className="grid gap-3">
          <legend className="text-[13px] font-medium tracking-wide text-muted">
            What is it
          </legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => patch({ category: cat })}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  form.category === cat
                    ? "bg-primary text-primary-fg"
                    : "bg-surface text-muted shadow-[var(--shadow-card)] hover:text-fg",
                )}
              >
                {CATEGORY_META[cat].label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="text-[13px] font-medium tracking-wide text-muted">
            How it moves
          </legend>
          <div className="flex flex-wrap gap-2">
            {DEAL_TYPES.map((deal) => (
              <button
                key={deal}
                type="button"
                onClick={() => patch({ dealType: deal })}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  form.dealType === deal
                    ? "bg-primary text-primary-fg"
                    : "bg-surface text-muted shadow-[var(--shadow-card)] hover:text-fg",
                )}
              >
                {DEAL_META[deal].label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5">
          <Field
            label="Title"
            name="title"
            placeholder={copy.title}
            required
            minLength={4}
            value={form.title}
            onChange={(event) => patch({ title: event.target.value })}
          />
          <Field
            label="One-line summary"
            name="summary"
            placeholder={copy.summary}
            required
            minLength={8}
            value={form.summary}
            onChange={(event) => patch({ summary: event.target.value })}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="description">
              {form.dealType === "seeking"
                ? "Describe the request"
                : form.category === "skills" || form.dealType === "offered"
                  ? "Describe the skill"
                  : "The full story"}
            </Label>
            <Textarea
              id="description"
              name="description"
              required
              minLength={20}
              maxLength={1000}
              placeholder={copy.story}
              value={form.description}
              onChange={(event) => patch({ description: event.target.value })}
            />
            <p className="text-xs text-subtle">
              Two lines show on the board. The whole description shows when
              someone opens the listing. 1,000 characters.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Price outside South Carolina"
              name="priceLabel"
              placeholder={form.dealType === "seeking" ? "Trade labor or cash" : "$7 / bale"}
              required
              value={form.priceLabel}
              onChange={(event) => patch({ priceLabel: event.target.value })}
            />
            <Field
              label="Quantity"
              name="quantity"
              placeholder={form.dealType === "seeking" ? "As soon as next week" : "80 bales"}
              required
              value={form.quantity}
              onChange={(event) => patch({ quantity: event.target.value })}
            />
          </div>
          <p className="-mt-2 text-sm text-muted">
            South Carolina neighbors always see Free. That price is only for
            other states if you open them.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="county">County (public)</Label>
              <CountySelect
                id="county"
                required
                value={form.county}
                state={form.state}
                onChange={(value, nextState) => {
                  patch({ county: value, state: nextState });
                }}
              />
            </div>
            <Field
              label="A public line about the listing"
              name="farmNote"
              placeholder="Dry bales, stacked in the barn."
              required
              minLength={8}
              value={form.farmNote}
              onChange={(event) => patch({ farmNote: event.target.value })}
            />
          </div>
          <p className="text-sm text-muted">
            Your real name, address, phone, and email stay on your profile —
            only you see them. After someone accepts, talk in a private
            message thread. Keep contact details out of this public listing.
          </p>
          <Field
            label="Tags (optional)"
            name="tags"
            placeholder="hay, timothy, feed"
            value={form.tags}
            onChange={(event) => patch({ tags: event.target.value })}
          />
        </div>

        <PhotoPicker
          value={form.imagePath}
          onChange={(imagePath) => patch({ imagePath })}
          hint={copy.photo}
        />

        {error ? <p className="text-sm text-primary">{error}</p> : null}

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={pending !== null}>
              {pending === "publish" ? "Posting…" : copy.submit}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={pending !== null}
              onClick={() => {
                setPending("draft");
                setError(null);
                void persistDraft()
                  .then(async (listing) => {
                    toast("Draft saved — still off the board");
                    if (!search.draft || search.draft !== listing.id) {
                      await navigate({
                        to: "/post",
                        search: { draft: listing.id },
                        replace: true,
                      });
                    }
                  })
                  .catch(() => {
                    setError("Could not save that draft. Try again.");
                  })
                  .finally(() => setPending(null));
              }}
            >
              {pending === "draft" ? "Saving…" : "Save draft"}
            </Button>
          </div>
          <p className="text-sm text-muted">
            Save draft keeps tags, photos, and text on your account. A photo
            that fails to upload will not wipe the rest of this form.
          </p>
          {isListingFormDirty(form) ? (
            <button
              type="button"
              className="justify-self-start text-sm text-muted underline-offset-2 hover:text-fg hover:underline"
              onClick={() => {
                const next = freshForm(search, homeCounty, homeState);
                setForm(next);
                clearListingForm();
                setError(null);
                if (search.draft) {
                  void navigate({ to: "/post", search: {}, replace: true });
                }
              }}
            >
              Start a new listing
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: {
  label: string;
  name: string;
} & ComponentProps<typeof Input>) {
  const id = name;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}
