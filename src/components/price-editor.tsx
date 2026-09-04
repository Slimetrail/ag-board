import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateListingOffer, updateOfficePrice } from "@/lib/listings";

export function PriceEditor({
  listingId,
  priceLabel,
  quantity,
  onSaved,
  office = false,
}: {
  listingId: number;
  priceLabel: string;
  quantity?: string;
  onSaved?: (next: { priceLabel: string; quantity: string }) => void;
  office?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState(priceLabel);
  const [qty, setQty] = useState(quantity ?? "");
  const [pending, setPending] = useState(false);

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        Adjust price
      </Button>
    );
  }

  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        const run = office
          ? updateOfficePrice({
              data: { listingId, priceLabel: price },
            })
          : updateListingOffer({
              data: {
                listingId,
                priceLabel: price,
                quantity: qty.trim() ? qty : undefined,
              },
            });
        void run
          .then((listing) => {
            toast("Price updated");
            setOpen(false);
            onSaved?.({
              priceLabel: listing.priceLabel,
              quantity: listing.quantity,
            });
          })
          .catch(() => toast("Could not change that price."))
          .finally(() => setPending(false));
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`price-${listingId}`}>Price outside South Carolina</Label>
        <Input
          id={`price-${listingId}`}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
          minLength={2}
          maxLength={40}
        />
      </div>
      {quantity !== undefined ? (
        <div className="grid gap-1.5">
          <Label htmlFor={`qty-${listingId}`}>Quantity</Label>
          <Input
            id={`qty-${listingId}`}
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            required
            minLength={1}
            maxLength={40}
          />
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-subtle">
        South Carolina neighbors still see Free. This price is only for other
        states.
      </p>
    </form>
  );
}
