import { useState } from "react";
import { fileToJpegDataUrl, PHOTO_MAX_LABEL, PHOTO_SIZE_HINT } from "@/lib/image-file";
import { uploadListingPhoto } from "@/lib/uploads";
import { cn } from "@/lib/utils";

function photoErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return `Could not use that photo. Try a JPEG or PNG under ${PHOTO_MAX_LABEL}.`;
}

function PhotoFileTrigger({
  capture,
  label,
  disabled,
  onFile,
}: {
  capture?: "environment";
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center justify-center rounded-lg px-4 py-3 text-sm font-medium",
        capture
          ? "border border-dashed border-border bg-wash/60 hover:bg-wash"
          : "border border-border bg-surface shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture } : {})}
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
      {label}
    </label>
  );
}

export function PhotoUploadButton({
  onUploaded,
  disabled,
  cameraLabel = "Take a photo",
  fileLabel = "Choose a file",
  className,
}: {
  onUploaded: (path: string) => void;
  disabled?: boolean;
  cameraLabel?: string;
  fileLabel?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setBusy(true);
    setError(null);
    void fileToJpegDataUrl(file)
      .then((dataUrl) => uploadListingPhoto({ data: { dataUrl } }))
      .then((result) => onUploaded(result.path))
      .catch((err: unknown) => setError(photoErrorMessage(err)))
      .finally(() => setBusy(false));
  }

  return (
    <div className={className}>
      <div className="grid gap-2">
        <PhotoFileTrigger
          capture="environment"
          label={busy ? "Saving photo…" : cameraLabel}
          disabled={busy || disabled}
          onFile={handleFile}
        />
        <PhotoFileTrigger
          label={busy ? "Saving photo…" : fileLabel}
          disabled={busy || disabled}
          onFile={handleFile}
        />
      </div>
      <p className="mt-2 text-sm text-subtle">{PHOTO_SIZE_HINT}</p>
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
        cameraLabel={value ? "Take a new photo" : "Take a photo"}
        fileLabel={value ? "Replace from files" : "Choose a file"}
      />

      {value ? (
        <div className="mt-4 overflow-hidden rounded-xl shadow-[var(--shadow-card)]">
          <img src={value} alt="" className="aspect-4/3 w-full object-cover" />
        </div>
      ) : null}
    </fieldset>
  );
}
