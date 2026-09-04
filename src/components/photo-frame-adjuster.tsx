import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PHOTO_FRAME_ASPECT,
  PHOTO_FRAME_MAX_ZOOM,
  clampPhotoFrame,
  cropRect,
  defaultPhotoFrame,
  minPhotoZoom,
  panPhotoFrame,
  photoFrameImageStyle,
  zoomPhotoFrame,
  type PhotoFrame,
  type PhotoFrameKind,
} from "@/lib/photo-frame";
import { cn } from "@/lib/utils";

type PointerPt = { x: number; y: number };

function distance(a: PointerPt, b: PointerPt) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: PointerPt, b: PointerPt): PointerPt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function PhotoFrameAdjuster({
  file,
  frameKind,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  file: File;
  frameKind: PhotoFrameKind;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (frame: PhotoFrame) => void;
}) {
  const aspect = PHOTO_FRAME_ASPECT[frameKind];
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [viewportNode, setViewportNode] = useState<HTMLDivElement | null>(null);
  const frameRef = useRef<PhotoFrame>(defaultPhotoFrame());
  const sizeRef = useRef({ width: 0, height: 0 });
  const pointersRef = useRef(new Map<number, PointerPt>());
  const gestureRef = useRef<{
    lastX: number;
    lastY: number;
    lastDist: number;
    lastMidX: number;
    lastMidY: number;
  } | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [frame, setFrame] = useState<PhotoFrame>(defaultPhotoFrame);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const busyRef = useRef(busy);
  frameRef.current = frame;
  busyRef.current = busy;
  if (imageSize) sizeRef.current = imageSize;

  const applyFrame = useCallback(
    (update: (current: PhotoFrame) => PhotoFrame) => {
      const size = sizeRef.current;
      if (!size.width) return;
      setFrame((current) =>
        clampPhotoFrame(size.width, size.height, aspect, update(current)),
      );
    },
    [aspect],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setImageSize(null);
    setFrame(defaultPhotoFrame());
    setLoadError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  useEffect(() => {
    if (!viewportNode) return;
    const frameEl: HTMLDivElement = viewportNode;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const size = sizeRef.current;
      if (!size.width || busyRef.current) return;
      const rect = frameEl.getBoundingClientRect();
      const origin = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
      };
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08;
      applyFrame((current) =>
        zoomPhotoFrame(size.width, size.height, aspect, current, current.zoom * factor, origin),
      );
    }
    frameEl.addEventListener("wheel", onWheel, { passive: false });
    return () => frameEl.removeEventListener("wheel", onWheel);
  }, [applyFrame, aspect, viewportNode]);

  function viewportOrigin(clientX: number, clientY: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 };
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointersRef.current.values()];
    if (pts.length >= 2) {
      const mid = midpoint(pts[0]!, pts[1]!);
      gestureRef.current = {
        lastX: mid.x,
        lastY: mid.y,
        lastDist: distance(pts[0]!, pts[1]!),
        lastMidX: mid.x,
        lastMidY: mid.y,
      };
    } else {
      gestureRef.current = {
        lastX: event.clientX,
        lastY: event.clientY,
        lastDist: 0,
        lastMidX: event.clientX,
        lastMidY: event.clientY,
      };
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId) || busy) return;
    event.preventDefault();
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const size = sizeRef.current;
    const rect = viewportRef.current?.getBoundingClientRect();
    const gesture = gestureRef.current;
    if (!size.width || !rect || !gesture) return;
    const pts = [...pointersRef.current.values()];
    if (pts.length >= 2) {
      const mid = midpoint(pts[0]!, pts[1]!);
      const dist = distance(pts[0]!, pts[1]!);
      const origin = viewportOrigin(mid.x, mid.y);
      if (gesture.lastDist > 0) {
        const factor = dist / gesture.lastDist;
        applyFrame((current) => {
          const zoomed = zoomPhotoFrame(
            size.width,
            size.height,
            aspect,
            current,
            current.zoom * factor,
            origin,
          );
          return panPhotoFrame(
            size.width,
            size.height,
            aspect,
            zoomed,
            (mid.x - gesture.lastMidX) / rect.width,
            (mid.y - gesture.lastMidY) / rect.height,
          );
        });
      }
      gesture.lastDist = dist;
      gesture.lastMidX = mid.x;
      gesture.lastMidY = mid.y;
      gesture.lastX = mid.x;
      gesture.lastY = mid.y;
      return;
    }
    applyFrame((current) =>
      panPhotoFrame(
        size.width,
        size.height,
        aspect,
        current,
        (event.clientX - gesture.lastX) / rect.width,
        (event.clientY - gesture.lastY) / rect.height,
      ),
    );
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    const pts = [...pointersRef.current.values()];
    if (pts.length === 1) {
      gestureRef.current = {
        lastX: pts[0]!.x,
        lastY: pts[0]!.y,
        lastDist: 0,
        lastMidX: pts[0]!.x,
        lastMidY: pts[0]!.y,
      };
    } else if (pts.length === 0) {
      gestureRef.current = null;
    }
  }

  function bumpZoom(direction: 1 | -1) {
    const size = sizeRef.current;
    if (!size.width || busy) return;
    applyFrame((current) =>
      zoomPhotoFrame(
        size.width,
        size.height,
        aspect,
        current,
        current.zoom * (direction > 0 ? 1.2 : 1 / 1.2),
      ),
    );
  }

  const crop =
    imageSize &&
    cropRect(
      imageSize.width,
      imageSize.height,
      aspect,
      clampPhotoFrame(imageSize.width, imageSize.height, aspect, frame),
    );
  const minZoom = imageSize
    ? minPhotoZoom(imageSize.width, imageSize.height, aspect)
    : 1;
  const canZoomOut = frame.zoom > minZoom + 0.001;
  const canZoomIn = frame.zoom < PHOTO_FRAME_MAX_ZOOM - 0.001;
  const message = error || loadError;

  const dialog = (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-fg/65 p-3 sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-adjust-title"
        className="w-full max-w-lg rounded-xl bg-surface p-4 shadow-[var(--shadow-card)] sm:p-5"
      >
        <h2 id="photo-adjust-title" className="font-display text-2xl text-fg">
          Adjust the photo
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Pinch or scroll to zoom. Zoom out to fit the whole photo, or drag so
          the part you want sits in the frame.
        </p>

        <div
          ref={(node) => {
            viewportRef.current = node;
            setViewportNode((prev) => (prev === node ? prev : node));
          }}
          className={cn(
            "relative mt-4 cursor-grab touch-none overflow-hidden bg-wash select-none active:cursor-grabbing",
            frameKind === "avatar" ? "mx-auto aspect-square w-[min(100%,20rem)] rounded-full" : "aspect-4/3 w-full rounded-xl",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {src ? (
            <img
              src={src}
              alt=""
              draggable={false}
              className="absolute max-w-none outline-none"
              style={
                crop && imageSize
                  ? photoFrameImageStyle(crop, imageSize.width, imageSize.height)
                  : { width: "100%", height: "100%", objectFit: "cover" }
              }
              onLoad={(event) => {
                const img = event.currentTarget;
                if (img.naturalWidth < 2 || img.naturalHeight < 2) {
                  setLoadError("Could not read that photo. Try a JPEG or PNG.");
                  return;
                }
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                setFrame(defaultPhotoFrame());
              }}
              onError={() => {
                setLoadError("Could not read that photo. Try a JPEG or PNG.");
              }}
            />
          ) : null}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Zoom out"
            disabled={busy || !imageSize || !canZoomOut}
            onClick={() => bumpZoom(-1)}
          >
            <ZoomOut />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Zoom in"
            disabled={busy || !imageSize || !canZoomIn}
            onClick={() => bumpZoom(1)}
          >
            <ZoomIn />
          </Button>
        </div>

        {message ? (
          <p className="mt-3 text-sm text-fg" role="alert">
            {message}
          </p>
        ) : null}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            disabled={busy || !imageSize || Boolean(loadError)}
            onClick={() => onConfirm(frameRef.current)}
          >
            {busy ? "Saving photo…" : "Use this photo"}
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );

  if (!mounted) return dialog;
  return createPortal(dialog, document.body);
}
