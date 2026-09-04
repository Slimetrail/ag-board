import { z } from "zod";
import {
  CATEGORIES,
  DEAL_TYPES,
  type Category,
  type DealType,
} from "./catalog.ts";
import { isCountyInState, parseRegion, placeLabel } from "./geo.ts";
import { USER_IMAGE_PATH_MAX } from "./upload-path.ts";

/** Public board / category tiles / listing pages — never drafts. */
export const BOARD_VISIBLE_SQL = "available = true and is_draft = false";

export type ListingFormState = {
  draftId: number | null;
  category: Category;
  dealType: DealType;
  title: string;
  summary: string;
  description: string;
  priceLabel: string;
  quantity: string;
  farmNote: string;
  tags: string;
  imagePath: string;
  county: string;
  state: string;
};

export const EMPTY_LISTING_FORM: ListingFormState = {
  draftId: null,
  category: "materials",
  dealType: "sale",
  title: "",
  summary: "",
  description: "",
  priceLabel: "",
  quantity: "",
  farmNote: "",
  tags: "",
  imagePath: "",
  county: "",
  state: "SC",
};

export function isListingFormDirty(form: ListingFormState): boolean {
  return Boolean(
    form.draftId ||
      form.title.trim() ||
      form.summary.trim() ||
      form.description.trim() ||
      form.priceLabel.trim() ||
      form.quantity.trim() ||
      form.farmNote.trim() ||
      form.tags.trim() ||
      form.imagePath.trim() ||
      form.county.trim(),
  );
}

export const draftSaveInput = z.object({
  draftId: z.number().int().positive().optional(),
  category: z.enum(CATEGORIES),
  dealType: z.enum(DEAL_TYPES),
  title: z.string().max(80).optional().default(""),
  summary: z.string().max(140).optional().default(""),
  description: z.string().max(1000).optional().default(""),
  priceLabel: z.string().max(40).optional().default(""),
  quantity: z.string().max(40).optional().default(""),
  county: z.string().max(40).optional().default(""),
  state: z.string().trim().length(2).optional(),
  farmNote: z.string().max(160).optional().default(""),
  imagePath: z.string().max(USER_IMAGE_PATH_MAX).optional().default(""),
  tags: z.string().max(80).optional().default(""),
});

export type DraftSaveInput = z.infer<typeof draftSaveInput>;

export function draftPlace(
  county: string,
  state: string,
): { location: string; region: string } {
  const trimmed = county.trim();
  const code = state.trim().toUpperCase() || "SC";
  if (trimmed && isCountyInState(trimmed, code)) {
    return {
      location: `${trimmed} County`,
      region: placeLabel(trimmed, code),
    };
  }
  return { location: "", region: "" };
}

export function listingFormFromListing(listing: {
  id: number;
  category: Category;
  dealType: DealType;
  title: string;
  summary: string;
  description: string;
  priceLabel: string;
  quantity: string;
  farmNote: string;
  tags: string;
  imagePath: string;
  region: string;
}): ListingFormState {
  const place = parseRegion(listing.region);
  return {
    draftId: listing.id,
    category: listing.category,
    dealType: listing.dealType,
    title: listing.title,
    summary: listing.summary,
    description: listing.description,
    priceLabel: listing.priceLabel,
    quantity: listing.quantity,
    farmNote: listing.farmNote,
    tags: listing.tags,
    imagePath: listing.imagePath,
    county: place?.county ?? "",
    state: place?.state ?? "SC",
  };
}
