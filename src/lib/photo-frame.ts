export type PhotoFrameKind = "listing" | "avatar";

export type PhotoFrame = {
  /** Crop center, normalized 0–1 along image width. */
  cx: number;
  /** Crop center, normalized 0–1 along image height. */
  cy: number;
  /**
   * 1 = cover-fit (frame filled, image may be cropped).
   * Lower values zoom out toward contain (whole image visible, letterbox OK).
   * Higher values zoom in.
   */
  zoom: number;
};

export type PhotoCropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PhotoFrameDraw = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  /** True when the framed viewport includes area outside the bitmap. */
  needsMatte: boolean;
};

/** Listing cards and the post preview use aspect-4/3 object-cover. */
export const PHOTO_FRAME_ASPECT: Record<PhotoFrameKind, number> = {
  listing: 4 / 3,
  avatar: 1,
};

/** Cover-fit zoom: largest crop that still fills the frame. */
export const PHOTO_FRAME_COVER_ZOOM = 1;
export const PHOTO_FRAME_MAX_ZOOM = 4;

/** Matches `--color-wash` so exported letterbox matches the adjuster. */
export const PHOTO_FRAME_MATTE = "#cbb894";

export function defaultPhotoFrame(): PhotoFrame {
  return { cx: 0.5, cy: 0.5, zoom: PHOTO_FRAME_COVER_ZOOM };
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

/** Smallest rectangle of `aspect` that contains the entire image (contain-fit). */
export function containSize(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
): { width: number; height: number } {
  if (imageWidth <= 0 || imageHeight <= 0 || aspect <= 0) {
    return { width: 1, height: 1 };
  }
  if (imageWidth / imageHeight > aspect) {
    return { width: imageWidth, height: imageWidth / aspect };
  }
  return { width: imageHeight * aspect, height: imageHeight };
}

/** Zoom floor: entire image visible inside the frame (1 when aspects already match). */
export function minPhotoZoom(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
): number {
  const cover = coverSize(imageWidth, imageHeight, aspect);
  const contain = containSize(imageWidth, imageHeight, aspect);
  return clamp(cover.width / contain.width, Number.EPSILON, PHOTO_FRAME_COVER_ZOOM);
}

function axisLimits(half: number): { min: number; max: number } {
  return {
    min: Math.min(half, 1 - half),
    max: Math.max(half, 1 - half),
  };
}

export function clampPhotoFrame(
  imageWidth: number,
  imageHeight: number,
  aspect: number,
  frame: PhotoFrame,
): PhotoFrame {
  const zoom = clamp(
    frame.zoom,
    minPhotoZoom(imageWidth, imageHeight, aspect),
    PHOTO_FRAME_MAX_ZOOM,
  );
  const cover = coverSize(imageWidth, imageHeight, aspect);
  const width = cover.width / zoom;
  const height = cover.height / zoom;
  const x = axisLimits(width / 2 / imageWidth);
  const y = axisLimits(height / 2 / imageHeight);
  return {
    cx: clamp(frame.cx, x.min, x.max),
    cy: clamp(frame.cy, y.min, y.max),
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

export function cropExtendsOutside(
  imageWidth: number,
  imageHeight: number,
  rect: PhotoCropRect,
): boolean {
  return (
    rect.x < -1e-6 ||
    rect.y < -1e-6 ||
    rect.x + rect.width > imageWidth + 1e-6 ||
    rect.y + rect.height > imageHeight + 1e-6
  );
}

/**
 * Map the image∩crop intersection onto a canvas that represents `crop`.
 * When the crop is larger than the image, dest sits inset (letterbox).
 */
export function photoFrameDrawCommands(
  imageWidth: number,
  imageHeight: number,
  crop: PhotoCropRect,
  canvasWidth: number,
  canvasHeight: number,
): PhotoFrameDraw {
  const sx = Math.max(0, crop.x);
  const sy = Math.max(0, crop.y);
  const sr = Math.min(imageWidth, crop.x + crop.width);
  const sb = Math.min(imageHeight, crop.y + crop.height);
  const sw = Math.max(0, sr - sx);
  const sh = Math.max(0, sb - sy);
  const dx = crop.width === 0 ? 0 : ((sx - crop.x) / crop.width) * canvasWidth;
  const dy = crop.height === 0 ? 0 : ((sy - crop.y) / crop.height) * canvasHeight;
  const dw = crop.width === 0 ? 0 : (sw / crop.width) * canvasWidth;
  const dh = crop.height === 0 ? 0 : (sh / crop.height) * canvasHeight;
  return {
    sx,
    sy,
    sw,
    sh,
    dx,
    dy,
    dw,
    dh,
    needsMatte: cropExtendsOutside(imageWidth, imageHeight, crop),
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
