import { CATEGORIES, CATEGORY_META, type Category } from "./catalog.ts";

/** Stock library files live under /images and stay on disk as fallbacks. */
export function isStockLibraryPath(path: string) {
  return path.startsWith("/images/");
}

/**
 * A listing photo that can replace a category cover: any non-empty path that
 * is not a stock `/images/...` file (user uploads are `/uploads/{uuid}.jpg`).
 */
export function isUserListingPhoto(path: string) {
  const trimmed = path.trim();
  return trimmed.length > 0 && !isStockLibraryPath(trimmed);
}

/** Stock CATEGORY_META image, or a user listing photo when one is present. */
export function resolveCategoryCover(
  category: Category,
  listingImagePath: string | null | undefined,
): string {
  if (listingImagePath && isUserListingPhoto(listingImagePath)) {
    return listingImagePath;
  }
  return CATEGORY_META[category].image;
}

export type ListingPhotoCandidate = {
  category: Category;
  imagePath: string;
  createdAt: string;
};

/**
 * Most recent user-uploaded photo in `category`, or the stock cover when the
 * category has no visible user photos.
 */
export function pickLatestUserListingPhoto(
  category: Category,
  listings: ListingPhotoCandidate[],
): string {
  let latest: ListingPhotoCandidate | undefined;
  for (const listing of listings) {
    if (listing.category !== category) continue;
    if (!isUserListingPhoto(listing.imagePath)) continue;
    if (!latest || listing.createdAt > latest.createdAt) {
      latest = listing;
    }
  }
  return resolveCategoryCover(category, latest?.imagePath);
}

export function coversForAllCategories(
  listings: ListingPhotoCandidate[],
): Record<Category, string> {
  return Object.fromEntries(
    CATEGORIES.map((category) => [
      category,
      pickLatestUserListingPhoto(category, listings),
    ]),
  ) as Record<Category, string>;
}
