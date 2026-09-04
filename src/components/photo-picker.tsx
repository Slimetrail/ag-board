import { useState } from "react";
import { LISTING_IMAGES } from "@/lib/catalog";
import { uploadListingPhoto } from "@/lib/uploads";
import { cn } from "@/lib/utils";

async function fileToJpegDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

export function PhotoPicker({
  value,
  onChange,
  hint,
}: {
  value: string;
  onChange: (path: string) => void;
  hint: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <fieldset>
      <legend className="text-[13px] font-medium tracking-wide text-muted">
        Photo of the thing
      </legend>
      <p className="mt-1 mb-3 text-sm text-subtle">{hint}</p>

      <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-wash/60 px-4 py-3 text-sm font-medium hover:bg-wash">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="sr-only"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            void fileToJpegDataUrl(file)
              .then((dataUrl) => uploadListingPhoto({ data: { dataUrl } }))
              .then((result) => onChange(result.path))
              .catch(() =>
                setError("Could not use that photo. Try a JPEG or PNG under a few megabytes."),
              )
              .finally(() => setBusy(false));
          }}
        />
        {busy ? "Saving photo…" : "Upload your photo"}
      </label>
      {error ? (
        <p className="mt-2 text-sm text-fg" role="alert">
          {error}
        </p>
      ) : null}

      {value ? (
        <div className="mt-4 overflow-hidden rounded-xl shadow-[var(--shadow-card)]">
          <img src={value} alt="" className="aspect-4/3 w-full object-cover" />
        </div>
      ) : null}

      <p className="mt-5 text-[12px] tracking-wide text-subtle uppercase">
        Or pick from the library
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {LISTING_IMAGES.map((image) => (
          <button
            key={image.path}
            type="button"
            onClick={() => onChange(image.path)}
            className={cn(
              "overflow-hidden rounded-lg transition-[box-shadow,transform]",
              value === image.path
                ? "ring-2 ring-primary ring-offset-2 ring-offset-bg"
                : "shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
            )}
            aria-pressed={value === image.path}
            aria-label={image.label}
          >
            <img src={image.path} alt="" className="aspect-4/3 w-full object-cover" />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
