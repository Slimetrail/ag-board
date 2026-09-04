/** Stock category / listing library photos live under `/images/…`. */
export function isStockCatalogImage(path: string) {
  return path.startsWith("/images/");
}

/** How long each user cover stays on a category tile. */
export const CATEGORY_COVER_ROTATION_DAYS = 5;

const MS_PER_UTC_DAY = 86_400_000;

/** UTC calendar-day floor as milliseconds since the Unix epoch. */
export function utcDayFloorMs(at: Date): number {
  return Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
}

/**
 * Index of the current 5-day window in UTC.
 * 1970-01-01 through 1970-01-05 are epoch 0; 1970-01-06 starts epoch 1.
 */
export function utcFiveDayEpoch(at: Date): number {
  return Math.floor(utcDayFloorMs(at) / (MS_PER_UTC_DAY * CATEGORY_COVER_ROTATION_DAYS));
}

/** Unique user listing photos, sorted so every server picks the same cycle. */
export function userListingPhotos(paths: readonly string[]): string[] {
  const unique = new Set<string>();
  for (const path of paths) {
    if (path && !isStockCatalogImage(path)) unique.add(path);
  }
  return [...unique].sort();
}

/**
 * Pick one user photo for a category cover in the current 5-day UTC window.
 * `category` scopes the list (already filtered by caller); the cycle itself is
 * epoch index modulo the sorted photo list so all servers agree.
 */
export function selectRotatedUserCover(
  _category: string,
  userImagePaths: readonly string[],
  at: Date,
): string | null {
  const photos = userListingPhotos(userImagePaths);
  if (photos.length === 0) return null;
  return photos[utcFiveDayEpoch(at) % photos.length] ?? null;
}

/**
 * Prefer a rotating user listing photo over the stock CATEGORY_META image.
 * Fall back to stock when the category has no user photos.
 */
export function resolveCategoryCover(
  stockImage: string,
  listingImages: readonly string[],
  at: Date = new Date(),
  category = "",
): string {
  return selectRotatedUserCover(category, listingImages, at) ?? stockImage;
}
