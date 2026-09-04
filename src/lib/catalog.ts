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

export const DEAL_META: Record<DealType, { label: string; short: string }> = {
  sale: { label: "For sale", short: "Sale" },
  trade: { label: "Open to trade", short: "Trade" },
  share: { label: "Free / share", short: "Free" },
  lease: { label: "For lease", short: "Lease" },
  seeking: { label: "Looking for", short: "Seeking" },
  offered: { label: "Skill offered", short: "Offered" },
};

export const LISTING_IMAGES = [
  { path: "/images/goats.jpg", label: "Dairy goats" },
  { path: "/images/nubian.jpg", label: "Nubian goat" },
  { path: "/images/chickens.jpg", label: "Chickens" },
  { path: "/images/piglets.jpg", label: "Piglets" },
  { path: "/images/sheep.jpg", label: "Sheep" },
  { path: "/images/heifer.jpg", label: "Heifer" },
  { path: "/images/bees.jpg", label: "Beehives" },
  { path: "/images/tractor.jpg", label: "Tractor" },
  { path: "/images/brushhog.jpg", label: "Brush hog" },
  { path: "/images/tiller.jpg", label: "Tiller" },
  { path: "/images/chicken-tractor.jpg", label: "Chicken tractor" },
  { path: "/images/stock-tank.jpg", label: "Stock tank" },
  { path: "/images/hay.jpg", label: "Hay" },
  { path: "/images/posts.jpg", label: "Fence posts" },
  { path: "/images/panels.jpg", label: "Cattle panels" },
  { path: "/images/produce.jpg", label: "Tomatoes" },
  { path: "/images/garden-bed.jpg", label: "Herb bed" },
  { path: "/images/corn-squash.jpg", label: "Corn & squash" },
  { path: "/images/eggs.jpg", label: "Eggs" },
  { path: "/images/seeds.jpg", label: "Seeds" },
  { path: "/images/firewood.jpg", label: "Firewood" },
  { path: "/images/farrier.jpg", label: "Farrier" },
  { path: "/images/fencing.jpg", label: "Fencing" },
  { path: "/images/orchard.jpg", label: "Orchard" },
  { path: "/images/repair.jpg", label: "Repair" },
  { path: "/images/cheese.jpg", label: "Cheesemaking" },
  { path: "/images/cropland.jpg", label: "Cropland" },
  { path: "/images/pasture.jpg", label: "Pasture" },
  { path: "/images/hunting-woods.jpg", label: "Timber" },
  { path: "/images/hunting-creek.jpg", label: "Creek bottom" },
] as const;

export function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
  return base || "listing";
}
