import { useState } from "react";
import { fileToJpegDataUrl } from "@/lib/image-file";
import { uploadListingPhoto } from "@/lib/uploads";
import { cn } from "@/lib/utils";

export function PhotoUploadButton({
  onUploaded,
  disabled,
  label = "Upload your photo",
  className,
}: {
  onUploaded: (path: string) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={className}>
      <label
        className={cn(
          "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-wash/60 px-4 py-3 text-sm font-medium hover:bg-wash",
          (busy || disabled) && "pointer-events-none opacity-60",
        )}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/jpg"
          className="sr-only"
          disabled={busy || disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            setError(null);
            void fileToJpegDataUrl(file)
              .then((dataUrl) => uploadListingPhoto({ data: { dataUrl } }))
              .then((result) => onUploaded(result.path))
              .catch(() =>
                setError(
                  "Could not use that photo. Try a JPEG or PNG under a few megabytes.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
        {busy ? "Saving photo…" : label}
      </label>
      {error ? (
        <p className="mt-2 text-sm text-fg" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PhotoPicker({
  value,
  onChange,
  hint,
  legend = "Photo of the thing",
}: {
  value: string;
  onChange: (path: string) => void;
  hint: string;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium tracking-wide text-muted">
        {legend}
      </legend>
      <p className="mt-1 mb-3 text-sm text-subtle">{hint}</p>

      <PhotoUploadButton
        onUploaded={onChange}
        label={value ? "Replace with your photo" : "Upload your photo"}
      />

      {value ? (
        <div className="mt-4 overflow-hidden rounded-xl shadow-[var(--shadow-card)]">
          <img src={value} alt="" className="aspect-4/3 w-full object-cover" />
        </div>
      ) : null}
    </fieldset>
  );
}
