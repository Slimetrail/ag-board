/** Stock category / listing library photos live under `/images/…`. */
export function isStockCatalogImage(path: string) {
  return path.startsWith("/images/");
}

/**
 * Prefer the newest listing photo that is not a stock `/images/…` path.
 * Fall back to the category's CATEGORY_META image when none remain.
 */
export function resolveCategoryCover(
  stockImage: string,
  listingImagesNewestFirst: readonly string[],
): string {
  for (const path of listingImagesNewestFirst) {
    if (path && !isStockCatalogImage(path)) {
      return path;
    }
  }
  return stockImage;
}
