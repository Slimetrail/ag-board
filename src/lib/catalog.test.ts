import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isFreePriceLabel,
  listingDealBadge,
  listingPriceDisplay,
  resolveOfferDealType,
  scResidentSeesFree,
} from "./catalog.ts";

describe("isFreePriceLabel", () => {
  it("matches Free and common giveaway wording", () => {
    assert.equal(isFreePriceLabel("Free"), true);
    assert.equal(isFreePriceLabel("  FREE  "), true);
    assert.equal(isFreePriceLabel("Free at the porch"), true);
    assert.equal(isFreePriceLabel("free if you haul"), true);
    assert.equal(isFreePriceLabel("No charge"), true);
    assert.equal(isFreePriceLabel("Borrow it"), true);
  });

  it("does not treat a sale price or a title-like word as free", () => {
    assert.equal(isFreePriceLabel(""), false);
    assert.equal(isFreePriceLabel("$7 / bale"), false);
    assert.equal(isFreePriceLabel("Freedom Ranger chicks"), false);
    assert.equal(isFreePriceLabel("Freerange dozen"), false);
  });
});

describe("resolveOfferDealType", () => {
  it("keeps an explicit non-sale type", () => {
    assert.equal(resolveOfferDealType("trade", "Free"), "trade");
    assert.equal(resolveOfferDealType("seeking", "$20"), "seeking");
    assert.equal(resolveOfferDealType("share", "$7 / bale"), "share");
  });

  it("does not leave the sale default on a Free / Trade / Seeking price", () => {
    assert.equal(resolveOfferDealType("sale", "Free"), "share");
    assert.equal(resolveOfferDealType("sale", "Free bantam rooster"), "share");
    assert.equal(resolveOfferDealType("sale", "Trade for hay"), "trade");
    assert.equal(resolveOfferDealType("sale", "Looking for square bales"), "seeking");
    assert.equal(resolveOfferDealType("sale", "$750 the pair"), "sale");
  });

  it("treats a missing or unknown deal type like the sale default", () => {
    assert.equal(resolveOfferDealType(undefined, "Free"), "share");
    assert.equal(resolveOfferDealType("for-sale", "$10"), "sale");
  });
});

describe("listingDealBadge", () => {
  it("shows Free / Trade / For sale / Seeking on the tile", () => {
    assert.equal(
      listingDealBadge({ dealType: "sale", priceLabel: "Free" }),
      "Free",
    );
    assert.equal(
      listingDealBadge({ dealType: "share", priceLabel: "Borrow it" }),
      "Free",
    );
    assert.equal(
      listingDealBadge({ dealType: "trade", priceLabel: "Trade for hay" }),
      "Trade",
    );
    assert.equal(
      listingDealBadge({ dealType: "sale", priceLabel: "$1,450" }),
      "For sale",
    );
    assert.equal(
      listingDealBadge({ dealType: "seeking", priceLabel: "Will pay fairly" }),
      "Seeking",
    );
  });
});

describe("scResidentSeesFree", () => {
  it("does not force Free on Seeking / buy intent", () => {
    assert.equal(
      scResidentSeesFree({ dealType: "seeking", priceLabel: "Cash" }),
      false,
    );
    assert.equal(
      scResidentSeesFree({ dealType: "seeking", priceLabel: "Will pay fairly" }),
      false,
    );
    assert.equal(
      listingPriceDisplay(
        { dealType: "seeking", priceLabel: "Cash" },
        true,
      ),
      "Cash",
    );
    assert.equal(
      listingPriceDisplay(
        { dealType: "seeking", priceLabel: "Will pay fairly" },
        true,
      ),
      "Will pay fairly",
    );
  });

  it("still shows Free in SC for sales and true giveaways", () => {
    assert.equal(
      scResidentSeesFree({ dealType: "sale", priceLabel: "$750 the pair" }),
      true,
    );
    assert.equal(
      scResidentSeesFree({ dealType: "share", priceLabel: "Borrow it" }),
      true,
    );
    assert.equal(
      scResidentSeesFree({ dealType: "sale", priceLabel: "Free" }),
      true,
    );
    assert.equal(
      listingPriceDisplay(
        { dealType: "sale", priceLabel: "$750 the pair" },
        true,
      ),
      "Free",
    );
    assert.equal(
      listingPriceDisplay(
        { dealType: "share", priceLabel: "Free at the porch" },
        true,
      ),
      "Free",
    );
  });

  it("shows the stored price outside South Carolina", () => {
    assert.equal(
      listingPriceDisplay(
        { dealType: "sale", priceLabel: "$750 the pair" },
        false,
      ),
      "$750 the pair",
    );
    assert.equal(
      listingPriceDisplay(
        { dealType: "seeking", priceLabel: "Cash" },
        false,
      ),
      "Cash",
    );
  });

  it("lets a Seeking post keep Free when the owner wrote Free", () => {
    assert.equal(
      listingPriceDisplay({ dealType: "seeking", priceLabel: "Free" }, true),
      "Free",
    );
  });
});

describe("ListingPrice wiring", () => {
  it("passes deal type through tile, list, and detail so Seeking is not painted Free", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const price = readFileSync(
      join(here, "../components/listing-price.tsx"),
      "utf8",
    );
    const card = readFileSync(
      join(here, "../components/listing-card.tsx"),
      "utf8",
    );
    const detail = readFileSync(
      join(here, "../routes/listing.$slug.tsx"),
      "utf8",
    );
    assert.match(price, /scResidentSeesFree/);
    assert.match(price, /listingPriceDisplay/);
    assert.match(price, /dealType/);
    assert.match(card, /dealType=\{listing\.dealType\}/);
    assert.match(card, /priceLabel=\{listing\.priceLabel\}/);
    assert.match(detail, /dealType=\{listing\.dealType\}/);
    assert.match(detail, /<ListingEditor/);
    const editor = readFileSync(
      join(here, "../components/listing-editor.tsx"),
      "utf8",
    );
    assert.match(editor, /Edit post/);
    assert.match(editor, /updateOwnListing/);
    const listings = readFileSync(join(here, "listings.ts"), "utf8");
    assert.match(listings, /export const updateOwnListing/);
    const yourListings = readFileSync(
      join(here, "../routes/listings.tsx"),
      "utf8",
    );
    assert.match(yourListings, /editPosts/);
    const post = readFileSync(join(here, "../routes/post.tsx"), "utf8");
    assert.match(post, /Seeking is not shown as Free/);
    assert.match(post, /What you can offer/);
  });
});
