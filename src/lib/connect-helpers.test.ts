import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bookmarkToast,
  canSubmitRating,
  hasCompleteCategoryScores,
  interestedButtonLabel,
  legacyStarsFromCategoryScores,
  legacyStarsToCategoryScores,
  looksLikeContactPii,
  pairUserIds,
  RATING_CATEGORY_INFO,
  RATING_CATEGORY_LABELS,
  ratingSetOverall,
  roundRatingAverage,
  shouldDisplayNeighborRating,
  shouldRevealPersonal,
  shouldShowInterested,
  shouldShowInviteRespond,
  summarizeRatingSets,
  summarizeRatings,
} from "./connect-helpers.ts";

describe("shouldRevealPersonal", () => {
  it("reveals only to the profile owner", () => {
    assert.equal(shouldRevealPersonal("self"), true);
    assert.equal(shouldRevealPersonal("connected"), false);
    assert.equal(shouldRevealPersonal("pending-in"), false);
    assert.equal(shouldRevealPersonal("pending-out"), false);
    assert.equal(shouldRevealPersonal("none"), false);
  });
});

describe("looksLikeContactPii", () => {
  it("flags email and phone, not ordinary farm talk", () => {
    assert.equal(looksLikeContactPii("I can pick up Saturday after chores."), false);
    assert.equal(looksLikeContactPii("Call me at 864-555-1212"), true);
    assert.equal(looksLikeContactPii("Email pat@farm.example"), true);
    assert.equal(looksLikeContactPii("Need 12 square bales"), false);
  });
});

describe("pairUserIds", () => {
  it("sorts the two ids the same way either order", () => {
    assert.deepEqual(pairUserIds("b", "a"), ["a", "b"]);
    assert.deepEqual(pairUserIds("a", "b"), ["a", "b"]);
  });
});

describe("ratings", () => {
  it("unlocks one rating after the deal is marked done", () => {
    assert.equal(canSubmitRating(false, false), false);
    assert.equal(canSubmitRating(true, false), true);
    assert.equal(canSubmitRating(true, true), false);
  });

  it("averages to one decimal", () => {
    assert.deepEqual(summarizeRatings([]), { average: null, count: 0 });
    assert.deepEqual(summarizeRatings([5, 4, 4]), { average: 4.3, count: 3 });
    assert.equal(roundRatingAverage("4.25"), 4.3);
    assert.equal(roundRatingAverage(null), null);
  });

  it("shows a 4.0+ average after the first rating", () => {
    assert.equal(shouldDisplayNeighborRating(5, 1), true);
    assert.equal(shouldDisplayNeighborRating(4, 1), true);
    assert.equal(shouldDisplayNeighborRating(4.3, 3), true);
    const loneFive = summarizeRatings([5]);
    assert.equal(shouldDisplayNeighborRating(loneFive.average, loneFive.count), true);
  });

  it("hides a sub-4 average until six ratings", () => {
    assert.equal(shouldDisplayNeighborRating(3.9, 1), false);
    assert.equal(shouldDisplayNeighborRating(1, 1), false);
    assert.equal(shouldDisplayNeighborRating(3.9, 5), false);
    const afterGrudge = summarizeRatings([5, 1]);
    assert.equal(afterGrudge.average, 3);
    assert.equal(afterGrudge.count, 2);
    assert.equal(
      shouldDisplayNeighborRating(afterGrudge.average, afterGrudge.count),
      false,
    );
  });

  it("always shows the score once six ratings are in", () => {
    assert.equal(shouldDisplayNeighborRating(1, 6), true);
    assert.equal(shouldDisplayNeighborRating(2.5, 6), true);
    assert.equal(shouldDisplayNeighborRating(3.9, 10), true);
    const established = summarizeRatings([5, 1, 1, 1, 1, 1]);
    assert.equal(established.count, 6);
    assert.ok((established.average ?? 0) < 4);
    assert.equal(
      shouldDisplayNeighborRating(established.average, established.count),
      true,
    );
  });

  it("hides empty or invalid averages", () => {
    assert.equal(shouldDisplayNeighborRating(null, 0), false);
    assert.equal(shouldDisplayNeighborRating(null, 3), false);
    assert.equal(shouldDisplayNeighborRating(Number.NaN, 4), false);
    assert.equal(shouldDisplayNeighborRating(5, 0), false);
  });

  it("keeps category labels and info-button copy word for word", () => {
    assert.equal(RATING_CATEGORY_LABELS.honesty, "Honesty");
    assert.equal(RATING_CATEGORY_LABELS.courtesy, "Courtesy");
    assert.equal(RATING_CATEGORY_LABELS.reliability, "Reliability");
    assert.equal(
      RATING_CATEGORY_INFO.honesty,
      "the listing matched what showed up. Weight, condition, price, no bait-and-switch. That\u2019s \u201cjust weights and measures\u201d and \u201clet your yes be yes.\u201d",
    );
    assert.equal(
      RATING_CATEGORY_INFO.courtesy,
      "polite, respectful, no yelling at the gate. That\u2019s the \u201clove your neighbor\u201d part people feel immediately.",
    );
    assert.equal(
      RATING_CATEGORY_INFO.reliability,
      "they came when they said they would, paid or delivered as agreed, and didn\u2019t leave you hanging. That\u2019s faithfulness in a small thing.",
    );
    assert.match(RATING_CATEGORY_INFO.honesty, /\u2019|\u201c|\u201d/);
    assert.match(RATING_CATEGORY_INFO.courtesy, /\u2019|\u201c|\u201d/);
    assert.match(RATING_CATEGORY_INFO.reliability, /\u2019/);
  });

  it("requires all three category scores before a rating-set is complete", () => {
    assert.equal(
      hasCompleteCategoryScores({ honesty: 5, courtesy: 4, reliability: 3 }),
      true,
    );
    assert.equal(
      hasCompleteCategoryScores({ honesty: 5, courtesy: null, reliability: 3 }),
      false,
    );
    assert.equal(
      hasCompleteCategoryScores({ honesty: 0, courtesy: 4, reliability: 3 }),
      false,
    );
    assert.equal(
      hasCompleteCategoryScores({ honesty: 6, courtesy: 4, reliability: 3 }),
      false,
    );
  });

  it("treats a rating-set overall as the mean of its three category scores", () => {
    assert.equal(ratingSetOverall({ honesty: 5, courtesy: 4, reliability: 3 }), 4);
    assert.equal(
      ratingSetOverall({ honesty: 5, courtesy: 5, reliability: 4 }),
      14 / 3,
    );
  });

  it("copies a legacy single star into all three categories", () => {
    assert.deepEqual(legacyStarsToCategoryScores(4), {
      honesty: 4,
      courtesy: 4,
      reliability: 4,
    });
    assert.equal(
      legacyStarsFromCategoryScores({ honesty: 5, courtesy: 4, reliability: 4 }),
      4,
    );
  });

  it("averages rating-sets as mean of set overalls (same as mean of category avgs)", () => {
    const sets = [
      { honesty: 5, courtesy: 4, reliability: 3 },
      { honesty: 5, courtesy: 5, reliability: 5 },
    ];
    const summary = summarizeRatingSets(sets);
    assert.equal(summary.count, 2);
    assert.equal(summary.overallAverage, 4.5);
    assert.equal(summary.honestyAverage, 5);
    assert.equal(summary.courtesyAverage, 4.5);
    assert.equal(summary.reliabilityAverage, 4);
    const categoryMean =
      ((summary.honestyAverage ?? 0) +
        (summary.courtesyAverage ?? 0) +
        (summary.reliabilityAverage ?? 0)) /
      3;
    assert.equal(Math.round(categoryMean * 10) / 10, summary.overallAverage);

    const fromLegacy = summarizeRatingSets([legacyStarsToCategoryScores(5)]);
    assert.equal(fromLegacy.overallAverage, 5);
    assert.equal(fromLegacy.honestyAverage, 5);
    assert.equal(fromLegacy.count, 1);
    assert.equal(shouldDisplayNeighborRating(fromLegacy.overallAverage, fromLegacy.count), true);

    const hidden = summarizeRatingSets([
      { honesty: 3, courtesy: 3, reliability: 2 },
    ]);
    assert.equal(hidden.overallAverage, 2.7);
    assert.equal(shouldDisplayNeighborRating(hidden.overallAverage, hidden.count), false);

    assert.deepEqual(summarizeRatingSets([]), {
      overallAverage: null,
      honestyAverage: null,
      courtesyAverage: null,
      reliabilityAverage: null,
      count: 0,
    });
  });
});

describe("connect flow actions", () => {
  it("shows Accept/Deny only for an incoming request", () => {
    assert.equal(shouldShowInviteRespond("pending-in"), true);
    assert.equal(shouldShowInviteRespond("pending-out"), false);
    assert.equal(shouldShowInviteRespond("none"), false);
    assert.equal(shouldShowInviteRespond("connected"), false);
  });

  it("lets a listing viewer mark Interested without mixing in Accept/Deny", () => {
    assert.equal(shouldShowInterested("none"), true);
    assert.equal(shouldShowInterested("pending-out"), true);
    assert.equal(shouldShowInterested("pending-in"), false);
    assert.equal(shouldShowInterested("connected"), false);
    assert.equal(shouldShowInterested("self"), false);
  });

  it("labels Interested as a request, not a bookmark", () => {
    assert.equal(interestedButtonLabel("none", false), "Interested");
    assert.equal(interestedButtonLabel("pending-out", false), "Interested — waiting on Accept");
    assert.equal(interestedButtonLabel("none", true), "Sending…");
  });

  it("keeps favorite toasts on-device only", () => {
    assert.deepEqual(bookmarkToast(true, "Hay"), {
      title: "Favorited — bookmark only",
      description: "Hay — they were not notified.",
    });
    assert.deepEqual(bookmarkToast(false, "Hay"), {
      title: "Removed from favorites",
      description: "Hay",
    });
  });
});
