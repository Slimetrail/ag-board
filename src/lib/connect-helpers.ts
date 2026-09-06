/** Personal contact fields are only for the signed-in user's own profile. */
export function shouldRevealPersonal(relation: string): boolean {
  return relation === "self";
}

/** Obvious email or US-style phone in a public listing note. */
export function looksLikeContactPii(text: string): boolean {
  const value = text.trim();
  if (!value) return false;
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(value)) return true;
  if (/(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b/.test(value)) {
    return true;
  }
  return false;
}

/** Stable pair key so two user ids always map to one thread. */
export function pairUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export function canSubmitRating(dealDone: boolean, alreadyRated: boolean): boolean {
  return dealDone && !alreadyRated;
}

export const RATING_CATEGORIES = ["honesty", "courtesy", "reliability"] as const;
export type RatingCategory = (typeof RATING_CATEGORIES)[number];

export type CategoryScores = {
  honesty: number;
  courtesy: number;
  reliability: number;
};

export type PartialCategoryScores = {
  honesty: number | null;
  courtesy: number | null;
  reliability: number | null;
};

export type CategoryAverages = {
  honesty: number | null;
  courtesy: number | null;
  reliability: number | null;
};

export const RATING_CATEGORY_LABELS: Record<RatingCategory, string> = {
  honesty: "Honesty",
  courtesy: "Courtesy",
  reliability: "Reliability",
};

/** Info-button copy — word for word, including curly quotes. */
export const RATING_CATEGORY_INFO: Record<RatingCategory, string> = {
  honesty:
    "the listing matched what showed up. Weight, condition, price, no bait-and-switch. That\u2019s \u201cjust weights and measures\u201d and \u201clet your yes be yes.\u201d",
  courtesy:
    "polite, respectful, no yelling at the gate. That\u2019s the \u201clove your neighbor\u201d part people feel immediately.",
  reliability:
    "they came when they said they would, paid or delivered as agreed, and didn\u2019t leave you hanging. That\u2019s faithfulness in a small thing.",
};

export function isValidCategoryScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

export function hasCompleteCategoryScores(
  scores: PartialCategoryScores,
): scores is CategoryScores {
  return (
    isValidCategoryScore(scores.honesty) &&
    isValidCategoryScore(scores.courtesy) &&
    isValidCategoryScore(scores.reliability)
  );
}

/**
 * Overall for one rating-set is the unrounded mean of its three category
 * scores. Public overall is the mean of those set overalls — the same number
 * as the mean of every category score, because each set always has three.
 */
export function ratingSetOverall(scores: CategoryScores): number {
  return (scores.honesty + scores.courtesy + scores.reliability) / 3;
}

/** Legacy single-star rows become a rating-set with all three categories equal. */
export function legacyStarsToCategoryScores(stars: number): CategoryScores {
  return { honesty: stars, courtesy: stars, reliability: stars };
}

/** Integer kept on the legacy `stars` column; display math uses categories. */
export function legacyStarsFromCategoryScores(scores: CategoryScores): number {
  return Math.min(5, Math.max(1, Math.round(ratingSetOverall(scores))));
}

export function summarizeRatingSets(sets: CategoryScores[]): {
  overallAverage: number | null;
  honestyAverage: number | null;
  courtesyAverage: number | null;
  reliabilityAverage: number | null;
  count: number;
} {
  if (sets.length === 0) {
    return {
      overallAverage: null,
      honestyAverage: null,
      courtesyAverage: null,
      reliabilityAverage: null,
      count: 0,
    };
  }
  const mean = (values: number[]) =>
    Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10;
  return {
    overallAverage: mean(sets.map(ratingSetOverall)),
    honestyAverage: mean(sets.map((set) => set.honesty)),
    courtesyAverage: mean(sets.map((set) => set.courtesy)),
    reliabilityAverage: mean(sets.map((set) => set.reliability)),
    count: sets.length,
  };
}

export function summarizeRatings(stars: number[]): {
  average: number | null;
  count: number;
} {
  if (stars.length === 0) return { average: null, count: 0 };
  const sum = stars.reduce((total, value) => total + value, 0);
  return {
    average: Math.round((sum / stars.length) * 10) / 10,
    count: stars.length,
  };
}

export function roundRatingAverage(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 10) / 10;
}

/** Show a 4.0+ score after the first rating; hide a weaker score until 6 ratings. */
export const PUBLIC_RATING_SHOW_MIN_AVERAGE = 4;
export const PUBLIC_RATING_ESTABLISHED_COUNT = 6;

/**
 * Public neighbor-rating visibility.
 * - average >= 4.0: show, even after one rating (a lone 5-star stays visible).
 * - average < 4.0 and count < 6: hide (protects an early grudge).
 * - count >= 6: always show; the pattern is established.
 */
export function shouldDisplayNeighborRating(
  average: number | null,
  count: number,
): boolean {
  if (count <= 0 || average == null || !Number.isFinite(average)) return false;
  if (count >= PUBLIC_RATING_ESTABLISHED_COUNT) return true;
  return average >= PUBLIC_RATING_SHOW_MIN_AVERAGE;
}

/** Incoming invite: recipient can Accept or Deny. */
export function shouldShowInviteRespond(relation: string): boolean {
  return relation === "pending-in";
}

/** Listing viewer can mark Interested unless they already got a request, connected, or own the card. */
export function shouldShowInterested(relation: string): boolean {
  return relation === "none" || relation === "pending-out";
}

export function interestedButtonLabel(relation: string, busy: boolean): string {
  if (busy) return "Sending…";
  if (relation === "pending-out") return "Interested — waiting on Accept";
  return "Interested";
}

export function bookmarkToast(nowFavorited: boolean, title: string): {
  title: string;
  description: string;
} {
  if (nowFavorited) {
    return {
      title: "Favorited — bookmark only",
      description: `${title} — they were not notified.`,
    };
  }
  return {
    title: "Removed from favorites",
    description: title,
  };
}
