import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canSubmitRating,
  looksLikeContactPii,
  pairUserIds,
  roundRatingAverage,
  shouldRevealPersonal,
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
});
