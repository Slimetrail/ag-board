import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  bookmarkToast,
  canMarkDealDone,
  canMarkDealPending,
  canSendOnThread,
  canSubmitRating,
  isActiveConnectionThread,
  isConnectedInviteStatus,
  isEndedInviteStatus,
  hasCompleteCategoryScores,
  canDisconnectConnection,
  CANCEL_REQUEST_LABEL,
  cancelRequestLabel,
  DISCONNECT_LABEL,
  disconnectLabel,
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
  shouldEmbedConnectPanelThread,
  shouldKeepThreadInInbox,
  shouldRenderOwnerListingThreads,
  shouldRenderVisitorThread,
  shouldShowCancelRequest,
  shouldShowConnectedChat,
  shouldShowInterested,
  shouldShowInviteRespond,
  threadDealStatus,
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

  it("lets only the listing owner walk Deal pending then Deal done", () => {
    assert.equal(threadDealStatus({}), "open");
    assert.equal(threadDealStatus({ dealPendingAt: "now" }), "pending");
    assert.equal(
      threadDealStatus({ dealPendingAt: "now", dealDoneAt: "later" }),
      "done",
    );
    assert.equal(canMarkDealPending(true, "open"), true);
    assert.equal(canMarkDealPending(false, "open"), false);
    assert.equal(canMarkDealPending(true, "pending"), false);
    assert.equal(canMarkDealDone(true, "pending"), true);
    assert.equal(canMarkDealDone(true, "open"), false);
    assert.equal(canMarkDealDone(false, "pending"), false);
    assert.equal(canSubmitRating(threadDealStatus({ dealDoneAt: "x" }) === "done", false), true);
    assert.equal(canSubmitRating(threadDealStatus({ dealPendingAt: "x" }) === "done", false), false);
  });

  it("treats ended invites and ended threads as not connected", () => {
    assert.equal(isConnectedInviteStatus("accepted"), true);
    assert.equal(isConnectedInviteStatus("ended"), false);
    assert.equal(isConnectedInviteStatus("pending"), false);
    assert.equal(isEndedInviteStatus("ended"), true);
    assert.equal(isEndedInviteStatus("accepted"), false);
    assert.equal(isActiveConnectionThread(null), true);
    assert.equal(isActiveConnectionThread("now"), false);
    assert.equal(shouldShowConnectedChat(false), true);
    assert.equal(shouldShowConnectedChat(true), false);
    assert.equal(canSendOnThread(true), false);
    assert.equal(canSendOnThread(false), true);
    assert.equal(
      shouldKeepThreadInInbox({
        endedAt: null,
        dealDoneAt: null,
        alreadyRated: false,
      }),
      true,
    );
    assert.equal(
      shouldKeepThreadInInbox({
        endedAt: "now",
        dealDoneAt: "now",
        alreadyRated: false,
      }),
      true,
    );
    assert.equal(
      shouldKeepThreadInInbox({
        endedAt: "now",
        dealDoneAt: "now",
        alreadyRated: true,
      }),
      false,
    );
    assert.equal(
      shouldKeepThreadInInbox({
        endedAt: "now",
        dealDoneAt: null,
        alreadyRated: false,
      }),
      false,
    );
    assert.equal(shouldShowInterested("none"), true);
    assert.equal(shouldRenderVisitorThread("none"), false);
    assert.equal(shouldRenderVisitorThread("connected"), true);
  });

  it("renders the thread for the visitor and the listing owner", () => {
    assert.equal(shouldRenderVisitorThread("connected"), true);
    assert.equal(shouldRenderVisitorThread("self"), false);
    assert.equal(shouldRenderOwnerListingThreads("self"), true);
    assert.equal(shouldRenderOwnerListingThreads("connected"), false);
    assert.equal(shouldEmbedConnectPanelThread(undefined), true);
    assert.equal(shouldEmbedConnectPanelThread(12), false);
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

  it("wires owner threads onto the listing card so both sides see the same chat", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const panel = readFileSync(join(here, "../components/connect-panel.tsx"), "utf8");
    assert.match(panel, /shouldRenderOwnerListingThreads/);
    assert.match(panel, /shouldRenderVisitorThread/);
    assert.match(panel, /shouldEmbedConnectPanelThread/);
    assert.doesNotMatch(panel, /<OwnerListingThreads/);
    const messagesPage = readFileSync(join(here, "../routes/messages.tsx"), "utf8");
    const threadIdx = messagesPage.indexOf("<MessageThread");
    const listIdx = messagesPage.indexOf("threads.map");
    assert.ok(threadIdx > 0 && listIdx > threadIdx);
  });

  it("places listing private chat under the photo, not in the aside", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const listingPage = readFileSync(
      join(here, "../routes/listing.$slug.tsx"),
      "utf8",
    );
    const photoIdx = listingPage.indexOf("aspect-4/3");
    const chatIdx = listingPage.indexOf("<ListingPhotoChat");
    const copyIdx = listingPage.indexOf("The listing");
    const asideIdx = listingPage.indexOf("<aside>");
    const connectIdx = listingPage.indexOf("<ConnectPanel");
    assert.ok(photoIdx > 0 && chatIdx > photoIdx);
    assert.ok(chatIdx < copyIdx && chatIdx < asideIdx);
    assert.ok(connectIdx > asideIdx);

    const photoChat = readFileSync(
      join(here, "../components/listing-photo-chat.tsx"),
      "utf8",
    );
    assert.match(photoChat, /OwnerListingThreads/);
    assert.match(photoChat, /MessageThread/);
    assert.match(photoChat, /shouldRenderVisitorThread/);
    assert.match(photoChat, /shouldRenderOwnerListingThreads/);
    assert.match(photoChat, /keptOwnerId/);
    assert.match(photoChat, /shouldShowCancelRequest/);
    assert.match(photoChat, /CancelRequestButton/);
    assert.match(photoChat, /cancelInvite/);
    const threadIdx = photoChat.indexOf("<MessageThread");
    const cancelIdx = photoChat.indexOf("<CancelRequestButton");
    assert.ok(threadIdx > 0 && cancelIdx > threadIdx);
  });

  it("hides Connected chat copy after Deal done ends the thread", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const thread = readFileSync(join(here, "../components/message-thread.tsx"), "utf8");
    assert.match(thread, /shouldShowConnectedChat/);
    assert.match(thread, /This connection has ended/);
    const messages = readFileSync(join(here, "messages.ts"), "utf8");
    assert.match(messages, /endThreadConnection/);
    assert.match(messages, /status = 'ended'/);
    assert.match(messages, /canSendOnThread/);
  });

  it("lets either party Disconnect an active thread before Deal done", () => {
    assert.equal(
      canDisconnectConnection({ connectionEnded: false, dealDone: false }),
      true,
    );
    assert.equal(
      canDisconnectConnection({ connectionEnded: true, dealDone: false }),
      false,
    );
    assert.equal(
      canDisconnectConnection({ connectionEnded: false, dealDone: true }),
      false,
    );
    assert.equal(
      canDisconnectConnection({ connectionEnded: true, dealDone: true }),
      false,
    );
    assert.equal(DISCONNECT_LABEL, "Disconnect");
    assert.equal(disconnectLabel(false), "Disconnect");
    assert.equal(disconnectLabel(true), "Disconnecting…");
    assert.equal(canSubmitRating(false, false), false);
  });

  it("wires Disconnect under listing photo messages and keeps Cancel request", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const thread = readFileSync(
      join(here, "../components/message-thread.tsx"),
      "utf8",
    );
    assert.match(thread, /DisconnectButton/);
    assert.match(thread, /disconnectConnection/);
    assert.match(thread, /canDisconnectConnection/);
    assert.match(thread, /onLeftConnection/);
    const disconnectIdx = thread.indexOf("<DisconnectButton");
    const dealDoneButtonIdx = thread.indexOf(
      '{pending ? "Saving…" : "Deal done"}',
    );
    assert.ok(disconnectIdx > 0 && dealDoneButtonIdx > disconnectIdx);

    const photoChat = readFileSync(
      join(here, "../components/listing-photo-chat.tsx"),
      "utf8",
    );
    assert.match(photoChat, /onLeftConnection/);
    assert.match(photoChat, /CancelRequestButton/);
    assert.match(photoChat, /shouldShowCancelRequest/);

    const button = readFileSync(
      join(here, "../components/disconnect-button.tsx"),
      "utf8",
    );
    assert.match(button, /disconnectLabel/);
    assert.match(button, /Disconnect/);

    const messages = readFileSync(join(here, "messages.ts"), "utf8");
    assert.match(messages, /export const disconnectConnection/);
    assert.match(messages, /canDisconnectConnection/);
    const disconnectFn = messages.slice(
      messages.indexOf("export const disconnectConnection"),
      messages.indexOf("export const markDealDone"),
    );
    assert.match(disconnectFn, /endThreadConnection/);
    assert.doesNotMatch(disconnectFn, /unpublishListingFromBoard/);
    assert.doesNotMatch(disconnectFn, /set deal_done_at/);
  });

  it("lets a listing viewer mark Interested without mixing in Accept/Deny", () => {
    assert.equal(shouldShowInterested("none"), true);
    assert.equal(shouldShowInterested("pending-out"), true);
    assert.equal(shouldShowInterested("pending-in"), false);
    assert.equal(shouldShowInterested("connected"), false);
    assert.equal(shouldShowInterested("self"), false);
  });

  it("offers Cancel request only while the invite is still pending-out", () => {
    assert.equal(shouldShowCancelRequest("pending-out"), true);
    assert.equal(shouldShowCancelRequest("pending-in"), false);
    assert.equal(shouldShowCancelRequest("connected"), false);
    assert.equal(shouldShowCancelRequest("none"), false);
    assert.equal(shouldShowCancelRequest("self"), false);
    assert.equal(CANCEL_REQUEST_LABEL, "Cancel request");
    assert.equal(cancelRequestLabel(false), "Cancel request");
    assert.equal(cancelRequestLabel(true), "Canceling…");
  });

  it("wires Cancel request onto pending-out surfaces", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const button = readFileSync(
      join(here, "../components/interested-button.tsx"),
      "utf8",
    );
    assert.match(button, /CancelRequestButton/);
    assert.match(button, /cancelInvite/);
    assert.match(button, /shouldShowCancelRequest/);
    assert.doesNotMatch(button, /Withdraw Interest/);

    const panel = readFileSync(join(here, "../components/connect-panel.tsx"), "utf8");
    assert.match(panel, /CancelRequestButton/);
    assert.match(panel, /cancelInvite/);
    assert.match(panel, /shouldShowCancelRequest/);

    const invitesPage = readFileSync(join(here, "../routes/invites.tsx"), "utf8");
    assert.match(invitesPage, /CancelRequestButton/);
    assert.match(invitesPage, /cancelInvite/);
    assert.match(invitesPage, /ListingThumb/);

    const photoChat = readFileSync(
      join(here, "../components/listing-photo-chat.tsx"),
      "utf8",
    );
    assert.match(photoChat, /CancelRequestButton/);
    assert.match(photoChat, /cancelInvite/);
    assert.match(photoChat, /shouldShowCancelRequest/);
    assert.doesNotMatch(photoChat, /Withdraw Interest/);

    const profiles = readFileSync(join(here, "profiles.ts"), "utf8");
    assert.match(profiles, /export const cancelInvite/);
    assert.match(profiles, /status = 'withdrawn'/);
    assert.match(profiles, /from_user_id = \$2 and status = 'pending'/);
    assert.match(
      profiles,
      /from_user_id = \$1 and to_user_id = \$2 and status = 'pending'/,
    );
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
