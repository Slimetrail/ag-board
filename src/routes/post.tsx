import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type ComponentProps } from "react";
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
import { createListing } from "@/lib/listings";
import { ensureOwnProfile } from "@/lib/profiles";
import { isCountyInState } from "@/lib/geo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/post")({
  validateSearch: (search: Record<string, unknown>) => {
    const next: { cat?: Category; deal?: DealType } = {};
    if (CATEGORIES.includes(search.cat as Category)) {
      next.cat = search.cat as Category;
    }
    if (DEAL_TYPES.includes(search.deal as DealType)) {
      next.deal = search.deal as DealType;
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
      photo: "A photo of what you need — your own picture, not a stock shot.",
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
      photo: "A photo of your work or tools — your own picture, not a stock shot.",
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
    photo: "A photo of the actual thing — your own picture, not a stock shot.",
    submit: "Put it on the board",
  };
}

function PostPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const homeCounty = useBoardStore((s) => s.homeCounty);
  const homeState = useBoardStore((s) => s.homeState);
  const setHomeCounty = useBoardStore((s) => s.setHomeCounty);
  const markPosted = useBoardStore((s) => s.markPosted);
  const [pending, setPending] = useState(false);
  const [category, setCategory] = useState<Category>(search.cat ?? "materials");
  const [dealType, setDealType] = useState<DealType>(search.deal ?? "sale");
  const [county, setCounty] = useState(homeCounty);
  const [state, setState] = useState(homeState || "SC");
  const [imagePath, setImagePath] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const copy = copyFor(category, dealType);

  return (
    <RequireUse reason="Posting a listing takes an account — and you agree the app is not a party to the deal.">
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-[13px] font-medium tracking-[0.16em] text-muted uppercase">
        Free to post
      </p>
      <h1 className="mt-2 font-display text-4xl sm:text-5xl">{copy.heading}</h1>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-muted">
        {copy.blurb}
      </p>

      <form
        className="mt-10 grid gap-8"
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          setPending(true);
          setError(null);
          if (!isCountyInState(county, state)) {
            setError("Pick the county this listing is in.");
            setPending(false);
            return;
          }
          if (!imagePath) {
            setError("Add a photo of what you're posting.");
            setPending(false);
            return;
          }
          try {
            const profile = await ensureOwnProfile();
            const listing = await createListing({
              data: {
                category,
                dealType,
                title: String(data.get("title") ?? ""),
                summary: String(data.get("summary") ?? ""),
                description: String(data.get("description") ?? ""),
                priceLabel: String(data.get("priceLabel") ?? ""),
                quantity: String(data.get("quantity") ?? ""),
                location: `${county} County`,
                county,
                state,
                farmName: `@${profile.username}`,
                farmNote: String(data.get("farmNote") ?? ""),
                imagePath,
                tags: String(data.get("tags") ?? ""),
              },
            });
            markPosted(listing.id);
            setHomeCounty(county, state);
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
            setPending(false);
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
                onClick={() => setCategory(cat)}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  category === cat
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
                onClick={() => setDealType(deal)}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  dealType === deal
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
          />
          <Field
            label="One-line summary"
            name="summary"
            placeholder={copy.summary}
            required
            minLength={8}
          />
          <div className="grid gap-1.5">
            <Label htmlFor="description">
              {dealType === "seeking"
                ? "Describe the request"
                : category === "skills" || dealType === "offered"
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
              placeholder={dealType === "seeking" ? "Trade labor or cash" : "$7 / bale"}
              required
            />
            <Field
              label="Quantity"
              name="quantity"
              placeholder={dealType === "seeking" ? "As soon as next week" : "80 bales"}
              required
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
                value={county}
                state={state}
                onChange={(value, nextState) => {
                  setCounty(value);
                  setState(nextState);
                }}
              />
            </div>
            <Field
              label="A public line about the listing"
              name="farmNote"
              placeholder="Dry bales, stacked in the barn."
              required
              minLength={8}
            />
          </div>
          <p className="text-sm text-muted">
            Your real name, address, phone, and email stay on your profile.
            Neighbors only see them after you press Accept request.
          </p>
          <Field
            label="Tags (optional)"
            name="tags"
            placeholder="hay, timothy, feed"
          />
        </div>

        <PhotoPicker value={imagePath} onChange={setImagePath} hint={copy.photo} />

        {error ? <p className="text-sm text-primary">{error}</p> : null}

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Posting…" : copy.submit}
        </Button>
      </form>
    </div>
    </RequireUse>
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
