/** Final uploaded JPEG size. Client compresses down to this; the server enforces it. */
export const PHOTO_MAX_BYTES = 3 * 1024 * 1024;

export const PHOTO_MAX_LABEL = "3 MB";

/** Longest data-URL we accept (~3 MB binary as base64 plus the JPEG prefix). */
export const PHOTO_MAX_DATA_URL_CHARS = 4_400_000;

/** First-pass longest edge. Phone shots are shrunk before encode. */
export const PHOTO_MAX_EDGE = 2048;

/** Stop shrinking below this; then we reject instead of making a tiny smear. */
export const PHOTO_MIN_EDGE = 640;

/** Refuse to decode a source file bigger than this (memory guard on phones). */
export const PHOTO_SOURCE_MAX_BYTES = 40 * 1024 * 1024;

export const PHOTO_SIZE_HINT = `Take a photo or choose a file. We save it as JPEG under ${PHOTO_MAX_LABEL}.`;
