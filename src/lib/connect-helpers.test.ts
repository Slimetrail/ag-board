import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bookmarkToast,
  canSubmitRating,
  interestedButtonLabel,
  looksLikeContactPii,
  pairUserIds,
  roundRatingAverage,
  shouldRevealPersonal,
  shouldShowInterested,
  shouldShowInviteRespond,
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
