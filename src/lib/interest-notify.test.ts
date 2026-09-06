import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Sql } from "./db.ts";
import {
  countPendingByListing,
  interestEmailSubject,
  interestEmailText,
  interestedNeighborHeadline,
  inviteListingFromRow,
  listingInterestInvites,
  listingThumbSrc,
  notifyListingOwnerOfInterest,
  pendingInterestLabel,
  resolvePublicAppOrigin,
  sendPlainEmail,
  shouldShowSiteInterestNotice,
} from "./interest-notify.ts";

describe("interestedNeighborHeadline", () => {
  it("uses singular and count forms", () => {
    assert.equal(interestedNeighborHeadline(0), "");
    assert.equal(
      interestedNeighborHeadline(1),
      "You have an interested neighbor",
    );
    assert.equal(
      interestedNeighborHeadline(3),
      "You have 3 interested neighbors",
    );
  });
});

describe("pendingInterestLabel", () => {
  it("labels card badges without extra punctuation", () => {
    assert.equal(pendingInterestLabel(0), "");
    assert.equal(pendingInterestLabel(1), "1 interested");
    assert.equal(pendingInterestLabel(4), "4 interested");
  });
});

describe("interest email copy", () => {
  it("names the public username and listing, not contact details", () => {
    const subject = interestEmailSubject("jane_farm", "Fresh eggs");
    assert.equal(subject, "@jane_farm marked Interested on Fresh eggs");
    assert.equal(subject.includes("@"), true);
    assert.equal(/@\S+\.\S+/.test(subject), false);

    const text = interestEmailText({
      requesterUsername: "jane_farm",
      listingTitle: "Fresh eggs",
      listingUrl: "https://ag-board-jet.vercel.app/listing/fresh-eggs-ab12",
      profileUrl: "https://ag-board-jet.vercel.app/u/jane_farm",
    });
    assert.match(text, /@jane_farm marked Interested on your listing "Fresh eggs"/);
    assert.match(text, /Their public profile: https:\/\/ag-board-jet\.vercel\.app\/u\/jane_farm/);
    assert.match(text, /Respond \(Accept or Deny\): https:\/\/ag-board-jet\.vercel\.app\/listing\/fresh-eggs-ab12/);
    assert.match(text, /Contact stays private until you Accept/);
    assert.equal(text.includes("jane_farm@"), false);
    assert.equal(text.includes("phone"), false);
    assert.equal(text.includes("address"), false);
  });
});

describe("invite listing photo", () => {
  it("maps the listing image onto each invite so multi-post owners can tell them apart", () => {
    assert.deepEqual(
      inviteListingFromRow({
        listingId: 4,
        listingTitle: "Fresh eggs",
        listingSlug: "fresh-eggs-ab12",
        listingImagePath: "/images/eggs.jpg",
      }),
      {
        id: 4,
        title: "Fresh eggs",
        slug: "fresh-eggs-ab12",
        imagePath: "/images/eggs.jpg",
      },
    );
    assert.equal(
      inviteListingFromRow({
        listingId: null,
        listingTitle: "Fresh eggs",
        listingSlug: "fresh-eggs-ab12",
        listingImagePath: "/images/eggs.jpg",
      }),
      null,
    );
    assert.equal(listingThumbSrc("/images/hay.jpg"), "/images/hay.jpg");
    assert.equal(listingThumbSrc("  "), null);
    assert.equal(listingThumbSrc(null), null);
  });

  it("loads listing image_path on listInvites and tiles it on owner notices", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const profiles = readFileSync(join(here, "profiles.ts"), "utf8");
    assert.match(profiles, /l\.image_path as listing_image_path/);
    assert.match(profiles, /inviteListingFromRow/);
    assert.match(profiles, /status = 'withdrawn'/);
    assert.match(profiles, /from_user_id = \$2 and status = 'pending'/);

    const banner = readFileSync(
      join(here, "../components/owner-interest-banner.tsx"),
      "utf8",
    );
    assert.match(banner, /ListingThumb/);
    assert.match(banner, /invite\.listing\.imagePath/);
    assert.match(banner, /INTEREST_POLL_MS/);
    assert.match(banner, /INTEREST_POPUP_KEY/);
    assert.match(banner, /setInterval\(onChange, INTEREST_POLL_MS\)/);
    assert.match(banner, /sessionStorage\.setItem\(`\$\{INTEREST_POPUP_KEY\}/);

    const inbox = readFileSync(
      join(here, "../components/listing-invite-inbox.tsx"),
      "utf8",
    );
    assert.match(inbox, /OwnerInterestRows/);
    assert.match(inbox, /showListing/);

    const listingsPage = readFileSync(join(here, "../routes/listings.tsx"), "utf8");
    assert.match(listingsPage, /OwnerInterestBanner showListing/);
    assert.match(listingsPage, /interestCounts=\{interestCounts\}/);
    const grid = readFileSync(join(here, "../components/listing-grid.tsx"), "utf8");
    assert.match(grid, /pendingInterest=\{interestCounts/);
  });
});

describe("site interest notice", () => {
  it("is mounted in the site shell so owners see it off the listing", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const shell = readFileSync(join(here, "../components/site-shell.tsx"), "utf8");
    assert.match(shell, /SiteInterestNotice/);
    assert.match(shell, /\{user \? <SiteInterestNotice \/> : null\}/);
  });

  it("keeps listing interest on a site-wide surface", () => {
    assert.equal(shouldShowSiteInterestNotice(0), false);
    assert.equal(shouldShowSiteInterestNotice(1), true);
    assert.deepEqual(
      listingInterestInvites([
        { listingId: 4 },
        { listingId: null },
        { listingId: 9 },
      ]),
      [{ listingId: 4 }, { listingId: 9 }],
    );
  });
});

describe("countPendingByListing", () => {
  it("ignores invites with no listing and tallies the rest", () => {
    assert.deepEqual(
      countPendingByListing([
        { listingId: 4 },
        { listingId: null },
        { listingId: 4 },
        { listingId: 9 },
      ]),
      { 4: 2, 9: 1 },
    );
  });
});

describe("resolvePublicAppOrigin", () => {
  it("prefers BETTER_AUTH_URL then falls back to the public alias", () => {
    assert.equal(
      resolvePublicAppOrigin({ BETTER_AUTH_URL: "https://ag.example/" }),
      "https://ag.example",
    );
    assert.equal(resolvePublicAppOrigin({}), "https://ag-board-jet.vercel.app");
  });
});

describe("sendPlainEmail", () => {
  it("skips when Resend is not configured", async () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousFrom = process.env.RESEND_FROM_EMAIL;
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM_EMAIL;
    try {
      const result = await sendPlainEmail({
        to: "owner@example.com",
        subject: "test",
        text: "body",
        fetchImpl: async () => {
          throw new Error("should not call Resend");
        },
      });
      assert.deepEqual(result, { sent: false, reason: "not_configured" });
    } finally {
      if (previousKey !== undefined) process.env.RESEND_API_KEY = previousKey;
      if (previousFrom !== undefined) process.env.RESEND_FROM_EMAIL = previousFrom;
    }
  });
});

describe("notifyListingOwnerOfInterest", () => {
  it("emails the account address and only public requester fields", async () => {
    const queries: string[] = [];
    const sql = {
      query: async (text: string) => {
        queries.push(text);
        if (text.includes("from listings")) {
          return [{ title: "Hay", slug: "hay-ab12", user_id: "owner-1" }];
        }
        if (text.includes('from "user"')) {
          return [{ email: "owner@example.com" }];
        }
        if (text.includes("from profiles")) {
          return [{ username: "neighbor_sam" }];
        }
        return [];
      },
    } as unknown as Sql;

    const sent: { to: string; subject: string; text: string }[] = [];
    const result = await notifyListingOwnerOfInterest(
      sql,
      {
        ownerUserId: "owner-1",
        requesterUserId: "req-2",
        listingId: 11,
      },
      async (input) => {
        sent.push(input);
        return { sent: true };
      },
    );

    assert.equal(result.sent, true);
    assert.equal(sent[0]?.to, "owner@example.com");
    assert.equal(sent[0]?.subject, "@neighbor_sam marked Interested on Hay");
    assert.match(sent[0]?.text ?? "", /@neighbor_sam/);
    assert.equal(sent[0]?.text.includes("req-2"), false);
    assert.equal(queries.some((q) => q.includes('from "user"')), true);
  });
});
