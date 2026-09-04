import { useEffect, useRef, useState, type MouseEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { PhotoFrameAdjuster } from "@/components/photo-frame-adjuster";
import {
  assertJpegUnderCap,
  assertPhotoFile,
  fileToFramedJpegDataUrl,
  PHOTO_SIZE_HINT,
  photoUserError,
} from "@/lib/image-file";
import { PHOTO_FRAME_ASPECT, type PhotoFrame, type PhotoFrameKind } from "@/lib/photo-frame";
import { uploadListingPhoto } from "@/lib/uploads";
import { cn } from "@/lib/utils";

/** No matching form — keeps the input out of profile/post <form> submit. */
const ORPHAN_FORM = "__ag_photo_orphan";

function HiddenFileInput({
  inputRef,
  capture,
  disabled,
  onFile,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  capture?: "environment";
  disabled?: boolean;
  onFile: (file: File) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      form={ORPHAN_FORM}
      tabIndex={-1}
      aria-hidden="true"
      className="sr-only"
      disabled={disabled}
      {...(capture ? { capture } : {})}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        event.stopPropagation();
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onFile(file);
      }}
    />
  );
}

export function PhotoUploadButton({
  onUploaded,
  disabled,
  cameraLabel = "Take a photo",
  fileLabel = "Choose a file",
  className,
  frame = "listing",
}: {
  onUploaded: (path: string) => void;
  disabled?: boolean;
  cameraLabel?: string;
  fileLabel?: string;
  className?: string;
  frame?: PhotoFrameKind;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadGen = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adjustFile, setAdjustFile] = useState<File | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleFile(file: File) {
    setError(null);
    try {
      assertPhotoFile(file);
    } catch (err: unknown) {
      setError(photoUserError(err));
      return;
    }
    setAdjustFile(file);
  }

  function cancelAdjust() {
    uploadGen.current += 1;
    setAdjustFile(null);
    setBusy(false);
    setError(null);
  }

  function confirmAdjust(next: PhotoFrame) {
    const file = adjustFile;
    if (!file) return;
    const gen = ++uploadGen.current;
    setBusy(true);
    setError(null);
    void fileToFramedJpegDataUrl(file, PHOTO_FRAME_ASPECT[frame], next)
      .then((dataUrl) => assertJpegUnderCap(dataUrl))
      .then((dataUrl) => uploadListingPhoto({ data: { dataUrl } }))
      .then((result) => {
        if (gen !== uploadGen.current) return;
        setAdjustFile(null);
        onUploaded(result.path);
      })
      .catch((err: unknown) => {
        if (gen !== uploadGen.current) return;
        setError(photoUserError(err));
      })
      .finally(() => {
        if (gen === uploadGen.current) setBusy(false);
      });
  }

  function openPicker(
    event: MouseEvent<HTMLButtonElement>,
    input: HTMLInputElement | null,
  ) {
    event.preventDefault();
    event.stopPropagation();
    input?.click();
  }

  const inputs = (
    <>
      <HiddenFileInput
        inputRef={cameraRef}
        capture="environment"
        disabled={busy || disabled || Boolean(adjustFile)}
        onFile={handleFile}
      />
      <HiddenFileInput
        inputRef={fileRef}
        disabled={busy || disabled || Boolean(adjustFile)}
        onFile={handleFile}
      />
    </>
  );

  return (
    <div className={className}>
      {mounted ? createPortal(inputs, document.body) : inputs}
      <div className="grid gap-2">
        <button
          type="button"
          disabled={busy || disabled || Boolean(adjustFile)}
          onClick={(event) => openPicker(event, cameraRef.current)}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-lg border border-dashed border-border bg-wash/60 px-4 py-3 text-sm font-medium hover:bg-wash",
            (busy || disabled || adjustFile) && "pointer-events-none opacity-60",
          )}
        >
          {busy ? "Saving photo…" : cameraLabel}
        </button>
        <button
          type="button"
          disabled={busy || disabled || Boolean(adjustFile)}
          onClick={(event) => openPicker(event, fileRef.current)}
          className={cn(
            "flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]",
            (busy || disabled || adjustFile) && "pointer-events-none opacity-60",
          )}
        >
          {busy ? "Saving photo…" : fileLabel}
        </button>
      </div>
      <p className="mt-2 text-sm text-subtle">{PHOTO_SIZE_HINT}</p>
      {error && !adjustFile ? (
        <p className="mt-2 text-sm text-fg" role="alert">
          {error}
        </p>
      ) : null}
      {adjustFile ? (
        <PhotoFrameAdjuster
          file={adjustFile}
          frameKind={frame}
          busy={busy}
          error={error}
          onCancel={cancelAdjust}
          onConfirm={confirmAdjust}
        />
      ) : null}
    </div>
  );
}

export function PhotoPicker({
  value,
  onChange,
  hint,
  legend = "Photo of the thing",
  frame = "listing",
}: {
  value: string;
  onChange: (path: string) => void;
  hint: string;
  legend?: string;
  frame?: PhotoFrameKind;
}) {
  return (
    <fieldset>
      <legend className="text-[13px] font-medium tracking-wide text-muted">
        {legend}
      </legend>
      <p className="mt-1 mb-3 text-sm text-subtle">{hint}</p>

      <PhotoUploadButton
        frame={frame}
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
