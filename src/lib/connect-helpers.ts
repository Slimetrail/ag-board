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
