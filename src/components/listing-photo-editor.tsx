import { useState } from "react";
import { toast } from "sonner";
import { PhotoPicker } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import { updateListingPhoto } from "@/lib/listings";

export function ListingPhotoEditor({
  listingId,
  imagePath,
  onSaved,
}: {
  listingId: number;
  imagePath: string;
  onSaved?: (next: { imagePath: string }) => void;
}) {
  const [open, setOpen] = useState(false);
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
        Change photo
      </Button>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      <PhotoPicker
        value={imagePath}
        hint="A photo of the actual thing — your own picture, not a stock shot."
        onChange={(path) => {
          setPending(true);
          void updateListingPhoto({
            data: { listingId, imagePath: path },
          })
            .then((listing) => {
              toast("Photo updated");
              onSaved?.({ imagePath: listing.imagePath });
            })
            .catch(() => toast("Could not change that photo."))
            .finally(() => setPending(false));
        }}
      />
      <div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Done
        </Button>
      </div>
    </div>
  );
}
