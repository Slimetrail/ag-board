/** Longest `image_path` we store — Vercel Blob public URLs, not `/uploads/…`. */
export const USER_IMAGE_PATH_MAX = 500;

const LEGACY_UPLOAD = /^\/uploads\/[a-z0-9-]+\.jpg$/i;

function isVercelBlobPhotoUrl(path: string) {
  try {
    const url = new URL(path);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    const blobHost =
      host === "blob.vercel-storage.com" ||
      host.endsWith(".blob.vercel-storage.com");
    if (!blobHost) return false;
    return /\.jpe?g$/i.test(url.pathname);
  } catch {
    return false;
  }
}

/** Local leftover `/uploads/….jpg` or a public Vercel Blob JPEG URL. */
export function isUserUploadPath(path: string) {
  return LEGACY_UPLOAD.test(path) || isVercelBlobPhotoUrl(path);
}
