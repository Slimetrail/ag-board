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
