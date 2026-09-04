export type PhotoFrameKind = "listing" | "avatar";

export type PhotoFrame = {
  /** Crop center, normalized 0–1 along image width. */
  cx: number;
  /** Crop center, normalized 0–1 along image height. */
  cy: number;
  /** 1 = cover-fit (largest crop). Higher zooms in. */
  zoom: number;
};

export type PhotoCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Listing cards and the post preview use aspect-4/3 object-cover. */
export const PHOTO_FRAME_ASPECT: Record<PhotoFrameKind, number> = {
  listing: 4 / 3,
  avatar: 1,
};

export const PHOTO_FRAME_MIN_ZOOM = 1;
export const PHOTO_FRAME_MAX_ZOOM = 4;

export function defaultPhotoFrame(): PhotoFrame {
  return { cx: 0.5, cy: 0.5, zoom: PHOTO_FRAME_MIN_ZOOM };
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.min(max, Math.max(min, value));
}

/** Largest rectangle of `aspect` that still covers the image (zoom = 1). */
export function coverSize(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || aspect <= 0) {
    return { width: 1, height: 1 };
  }
  if (imageWidth / imageHeight > aspect) {
    return { width: imageHeight * aspect, height: imageHeight };
  }
  return { width: imageWidth, height: imageWidth / aspect };
}

export function clampPhotoFrame(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  frame: PhotoFrame,
): PhotoFrame {
  const zoom = clamp(frame.zoom, PHOTO_FRAME_MIN_ZOOM, PHOTO_FRAME_MAX_ZOOM);
  const cover = coverSize(imageWidth, imageHeight, aspect);
  const width = cover.width / zoom;
  const height = cover.height / zoom;
  const minCx = width / 2 / imageWidth;
  const maxCx = 1 - width / 2 / imageWidth;
  const minCy = height / 2 / imageHeight;
  const maxCy = 1 - height / 2 / imageHeight;
  return {
    cx: clamp(frame.cx, minCx, maxCx),
    cy: clamp(frame.cy, minCy, maxCy),
    zoom,
  };
}

export function cropRect(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  frame: PhotoFrame,
): PhotoCropRect {
  const next = clampPhotoFrame(imageWidth, imageHeight, aspect, frame);
  const cover = coverSize(imageWidth, imageHeight, aspect);
  const width = cover.width / next.zoom;
  const height = cover.height / next.zoom;
  return {
    x: next.cx * imageWidth - width / 2,
    y: next.cy * imageHeight - height / 2,
    width,
    height,
  };
}

/** Pixel-aligned crop that stays inside the bitmap. */
export function integerCrop(
  imageWidth: number,
  imageHeight: number,
  rect: PhotoCropRect,
): PhotoCropRect {
  const width = Math.min(imageWidth, Math.max(1, Math.round(rect.width)));
  const height = Math.min(imageHeight, Math.max(1, Math.round(rect.height)));
  return {
    x: clamp(Math.round(rect.x), 0, imageWidth - width),
    y: clamp(Math.round(rect.y), 0, imageHeight - height),
    width,
    height,
  };
}

/**
 * Zoom around a viewport-normalized origin (0–1). Default is the frame center.
 */
export function zoomPhotoFrame(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  frame: PhotoFrame,
  nextZoom: number,
  origin: { x: number; y: number } = { x: 0.5, y: 0.5 },
): PhotoFrame {
  const current = clampPhotoFrame(imageWidth, imageHeight, aspect, frame);
  const before = cropRect(imageWidth, imageHeight, aspect, current);
  const ix = before.x + origin.x * before.width;
  const iy = before.y + origin.y * before.height;
  const zoomed = clampPhotoFrame(imageWidth, imageHeight, aspect, {
    ...current,
    zoom: nextZoom,
  });
  const cover = coverSize(imageWidth, imageHeight, aspect);
  const width = cover.width / zoomed.zoom;
  const height = cover.height / zoomed.zoom;
  return clampPhotoFrame(imageWidth, imageHeight, aspect, {
    cx: (ix - origin.x * width + width / 2) / imageWidth,
    cy: (iy - origin.y * height + height / 2) / imageHeight,
    zoom: zoomed.zoom,
  });
}

/**
 * Pan by a viewport-normalized delta. Positive dx means the finger moved right
 * (the image follows, so the crop slides left).
 */
export function panPhotoFrame(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  frame: PhotoFrame,
  dxNorm: number,
  dyNorm: number,
): PhotoFrame {
  const current = clampPhotoFrame(imageWidth, imageHeight, aspect, frame);
  const crop = cropRect(imageWidth, imageHeight, aspect, current);
  return clampPhotoFrame(imageWidth, imageHeight, aspect, {
    cx: current.cx - dxNorm * (crop.width / imageWidth),
    cy: current.cy - dyNorm * (crop.height / imageHeight),
    zoom: current.zoom,
  });
}

/** CSS placement so `crop` fills a positioned viewport. */
export function photoFrameImageStyle(crop: PhotoCropRect, imageWidth: number, imageHeight: number) {
  return {
    width: `${(imageWidth / crop.width) * 100}%`,
    height: `${(imageHeight / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    top: `${(-crop.y / crop.height) * 100}%`,
  };
}
