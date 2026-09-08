import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DEAL_META, DEAL_TYPES, type DealType } from "@/lib/catalog";
import { updateOwnListing } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function ListingEditor({
  listingId,
  title,
  summary,
  description,
  dealType,
  priceLabel,
  quantity,
  onSaved,
}: {
  listingId: number;
  title: string;
  summary: string;
  description: string;
  dealType: DealType;
  priceLabel: string;
  quantity: string;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [nextTitle, setNextTitle] = useState(title);
  const [nextSummary, setNextSummary] = useState(summary);
  const [nextDescription, setNextDescription] = useState(description);
  const [nextDeal, setNextDeal] = useState<DealType>(dealType);
  const [nextPrice, setNextPrice] = useState(priceLabel);
  const [nextQty, setNextQty] = useState(quantity);

  useEffect(() => {
    setNextTitle(title);
    setNextSummary(summary);
    setNextDescription(description);
    setNextDeal(dealType);
    setNextPrice(priceLabel);
    setNextQty(quantity);
  }, [title, summary, description, dealType, priceLabel, quantity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#edit-post") {
      setOpen(true);
      document.getElementById("edit-post")?.scrollIntoView({
        block: "start",
      });
    }
  }, []);

  if (!open) {
    return (
      <div id="edit-post">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          Edit post
        </Button>
      </div>
    );
  }

  const seeking = nextDeal === "seeking";

  return (
    <form
      id="edit-post"
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void updateOwnListing({
          data: {
            listingId,
            title: nextTitle,
            summary: nextSummary,
            description: nextDescription,
            dealType: nextDeal,
            priceLabel: nextPrice,
            quantity: nextQty,
          },
        })
          .then(() => {
            toast("Listing updated");
            setOpen(false);
            onSaved?.();
          })
          .catch(() => toast("Could not update that listing."))
          .finally(() => setPending(false));
      }}
    >
      <p className="text-sm font-medium">Edit post</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`edit-title-${listingId}`}>Title</Label>
        <Input
          id={`edit-title-${listingId}`}
          value={nextTitle}
          onChange={(event) => setNextTitle(event.target.value)}
          required
          minLength={4}
          maxLength={80}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`edit-summary-${listingId}`}>One-line summary</Label>
        <Input
          id={`edit-summary-${listingId}`}
          value={nextSummary}
          onChange={(event) => setNextSummary(event.target.value)}
          required
          minLength={8}
          maxLength={140}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`edit-body-${listingId}`}>
          {seeking ? "Describe the request" : "The full story"}
        </Label>
        <Textarea
          id={`edit-body-${listingId}`}
          value={nextDescription}
          onChange={(event) => setNextDescription(event.target.value)}
          required
          minLength={20}
          maxLength={1000}
        />
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">How it moves</legend>
        <div className="flex flex-wrap gap-2">
          {DEAL_TYPES.map((deal) => (
            <button
              key={deal}
              type="button"
              onClick={() => setNextDeal(deal)}
              className={cn(
                "h-9 rounded-full px-3 text-sm font-medium transition-colors",
                nextDeal === deal
                  ? "bg-primary text-primary-fg"
                  : "bg-wash text-muted hover:text-fg",
              )}
            >
              {DEAL_META[deal].label}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`edit-price-${listingId}`}>
            {seeking ? "What you can offer" : "Price outside South Carolina"}
          </Label>
          <Input
            id={`edit-price-${listingId}`}
            value={nextPrice}
            onChange={(event) => setNextPrice(event.target.value)}
            required
            minLength={2}
            maxLength={40}
            placeholder={seeking ? "Trade labor or cash" : "$7 / bale"}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`edit-qty-${listingId}`}>
            {seeking ? "When you need it" : "Quantity"}
          </Label>
          <Input
            id={`edit-qty-${listingId}`}
            value={nextQty}
            onChange={(event) => setNextQty(event.target.value)}
            required
            minLength={1}
            maxLength={40}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <p className="text-xs text-subtle">
        {seeking
          ? "Neighbors see this offer as you wrote it. Seeking is not shown as Free."
          : "South Carolina neighbors still see Free. This price is only for other states."}
      </p>
    </form>
  );
}
