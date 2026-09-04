export const CATEGORIES = [
  "livestock",
  "produce",
  "equipment",
  "materials",
  "skills",
  "land",
  "hunting",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const DEAL_TYPES = [
  "sale",
  "trade",
  "share",
  "lease",
  "seeking",
  "offered",
] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const CATEGORY_META: Record<
  Category,
  { label: string; kicker: string; blurb: string; image: string }
> = {
  livestock: {
    label: "Livestock",
    kicker: "On the hoof",
    blurb: "Sell or trade goats, cattle, birds, bees — animals ready for a new place.",
    image: "/images/heifer.jpg",
  },
  produce: {
    label: "Produce",
    kicker: "From the rows",
    blurb: "Eggs, corn, sauce, extra harvest — sell, trade, or send it down the road.",
    image: "/images/garden-bed.jpg",
  },
  equipment: {
    label: "Equipment",
    kicker: "In the shed",
    blurb: "Tractors and tools to sell, trade, or lend to a neighbor for free.",
    image: "/images/tractor.jpg",
  },
  materials: {
    label: "Materials",
    kicker: "What's extra",
    blurb: "Hay, posts, seed, wire, wood — leftover that shouldn't sit in the barn.",
    image: "/images/hay.jpg",
  },
  skills: {
    label: "Skills",
    kicker: "Hands for hire",
    blurb: "Farrier, fence, repair, pruning, making — labor you can book or trade.",
    image: "/images/farrier.jpg",
  },
  land: {
    label: "Farm leases",
    kicker: "Ground to work",
    blurb: "Cropland and pasture to lease — cash rent, share, or a handshake deal.",
    image: "/images/cropland.jpg",
  },
  hunting: {
    label: "Hunting leases",
    kicker: "Woods & edges",
    blurb: "Timber, creek bottoms, and dove fields offered by the season.",
    image: "/images/hunting-woods.jpg",
  },
};

export const DEAL_META: Record<
  DealType,
  { label: string; short: string; badge: string }
> = {
  sale: { label: "For sale", short: "Sale", badge: "For sale" },
  trade: { label: "Open to trade", short: "Trade", badge: "Trade" },
  share: { label: "Free / share", short: "Free", badge: "Free" },
  lease: { label: "For lease", short: "Lease", badge: "For lease" },
  seeking: { label: "Looking for", short: "Seeking", badge: "Seeking" },
  offered: { label: "Skill offered", short: "Offered", badge: "Offered" },
};

export function isDealType(value: string | null | undefined): value is DealType {
  return DEAL_TYPES.includes(value as DealType);
}

/** Price text that means the listing is given away, not sold. */
export function isFreePriceLabel(priceLabel: string): boolean {
  const text = priceLabel.trim().toLowerCase();
  if (!text) return false;
  return /^(free|no charge|giveaway)\b/.test(text) || text === "borrow it";
}

function isTradePriceLabel(priceLabel: string): boolean {
  return /^(trade|swap|barter)\b/.test(priceLabel.trim().toLowerCase());
}

function isSeekingPriceLabel(priceLabel: string): boolean {
  return /^(looking for|wanted|seeking)\b/.test(priceLabel.trim().toLowerCase());
}

/**
 * Offer type for badges and stored `deal_type`.
 * The post form defaults to "sale", so a Free / Trade / Seeking price wins
 * over that default. An explicit non-sale deal type is kept.
 */
export function resolveOfferDealType(
  dealType: string | null | undefined,
  priceLabel: string,
): DealType {
  const known = isDealType(dealType) ? dealType : "sale";
  if (known !== "sale") return known;
  if (isFreePriceLabel(priceLabel)) return "share";
  if (isTradePriceLabel(priceLabel)) return "trade";
  if (isSeekingPriceLabel(priceLabel)) return "seeking";
  return "sale";
}

/** Tile / list / detail badge copy for the listing's offer type. */
export function listingDealBadge(listing: {
  dealType: string;
  priceLabel: string;
}): string {
  return DEAL_META[resolveOfferDealType(listing.dealType, listing.priceLabel)]
    .badge;
}

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return base || "listing";
}
