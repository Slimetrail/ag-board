import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE,
  PHOTO_MAX_LABEL,
  PHOTO_MIN_EDGE,
  PHOTO_SOURCE_MAX_BYTES,
} from "./photo-limits.ts";

export {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_LABEL,
  PHOTO_SIZE_HINT,
} from "./photo-limits.ts";

/** Downscale at decode so a 12MP gallery shot never lands in memory at full size. */
export function pickDecodeResize(
  width: number,
  height: number,
  maxEdge: number,
): { resizeWidth: number } | { resizeHeight: number } {
  return width >= height
    ? { resizeWidth: maxEdge }
    : { resizeHeight: maxEdge };
}

export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = (comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl).replace(/\s/g, "");
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

export function nextJpegSettings(
  edge: number,
  quality: number,
): { edge: number; quality: number } | null {
  if (quality > 0.6) {
    return { edge, quality: Math.round((quality - 0.12) * 100) / 100 };
  }
  if (edge > PHOTO_MIN_EDGE) {
    return {
      edge: Math.max(PHOTO_MIN_EDGE, Math.round(edge * 0.75)),
      quality: 0.72,
    };
  }
  return null;
}

export function photoUserError(err: unknown): string {
  if (err instanceof Error && err.message === "Unauthorized") {
    return "Could not save that photo. You are still signed in — try again.";
  }
  if (err instanceof Error && err.message) return err.message;
  return `Could not use that photo. Try a JPEG or PNG under ${PHOTO_MAX_LABEL}.`;
}

export function assertJpegUnderCap(dataUrl: string): string {
  if (dataUrlByteLength(dataUrl) > PHOTO_MAX_BYTES) {
    throw new Error(
      `Could not shrink that photo under ${PHOTO_MAX_LABEL}. Try another shot.`,
    );
  }
  return dataUrl;
}

async function decodePhoto(file: File): Promise<ImageBitmap> {
  try {
    const probe = await createImageBitmap(file, {
      resizeWidth: 96,
      resizeQuality: "low",
    });
    const opts = pickDecodeResize(probe.width, probe.height, PHOTO_MAX_EDGE);
    probe.close();
    return await createImageBitmap(file, {
      ...opts,
      resizeQuality: "medium",
    });
  } catch {
    return createImageBitmap(file);
  }
}

function encodeJpeg(bitmap: ImageBitmap, edge: number, quality: number): string {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export async function fileToJpegDataUrl(file: File): Promise<string> {
  if (file.size < 32) {
    throw new Error("That file is empty.");
  }
  if (file.size > PHOTO_SOURCE_MAX_BYTES) {
    throw new Error(
      `That file is too large to open on this phone. Pick a smaller photo.`,
    );
  }
  if (file.type && !file.type.startsWith("image/")) {
    throw new Error("That file is not a photo.");
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodePhoto(file);
  } catch {
    throw new Error("Could not read that photo. Try a JPEG or PNG.");
  }

  try {
    let edge = Math.min(PHOTO_MAX_EDGE, Math.max(bitmap.width, bitmap.height));
    let quality = 0.84;
    for (;;) {
      const dataUrl = encodeJpeg(bitmap, edge, quality);
      if (dataUrlByteLength(dataUrl) <= PHOTO_MAX_BYTES) {
        return dataUrl;
      }
      const next = nextJpegSettings(edge, quality);
      if (!next) {
        throw new Error(
          `Could not shrink that photo under ${PHOTO_MAX_LABEL}. Try another shot.`,
        );
      }
      edge = next.edge;
      quality = next.quality;
    }
  } finally {
    bitmap.close();
  }
}
