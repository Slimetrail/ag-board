import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isFreePriceLabel,
  listingDealBadge,
  resolveOfferDealType,
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
