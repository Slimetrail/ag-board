import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, CATEGORY_META } from "./catalog.ts";
import {
  coversForAllCategories,
  isStockLibraryPath,
  isUserListingPhoto,
  pickLatestUserListingPhoto,
  resolveCategoryCover,
} from "./category-cover.ts";

describe("isStockLibraryPath", () => {
  it("treats CATEGORY_META and listing library files as stock", () => {
    assert.equal(isStockLibraryPath("/images/heifer.jpg"), true);
    assert.equal(isStockLibraryPath("/images/garden-bed.jpg"), true);
    for (const category of CATEGORIES) {
      assert.equal(isStockLibraryPath(CATEGORY_META[category].image), true);
    }
  });

  it("does not treat user uploads as stock", () => {
    assert.equal(
      isStockLibraryPath("/uploads/2f1a0c3e-4b5d-6789-abcd-ef0123456789.jpg"),
      false,
    );
  });
});

describe("isUserListingPhoto", () => {
  it("accepts uploaded listing photos and rejects stock or empty paths", () => {
    assert.equal(
      isUserListingPhoto("/uploads/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg"),
      true,
    );
    assert.equal(isUserListingPhoto("/images/heifer.jpg"), false);
    assert.equal(isUserListingPhoto(""), false);
    assert.equal(isUserListingPhoto("   "), false);
  });
});

describe("resolveCategoryCover", () => {
  it("keeps the stock cover when there is no user photo", () => {
    assert.equal(
      resolveCategoryCover("livestock", null),
      CATEGORY_META.livestock.image,
    );
    assert.equal(
      resolveCategoryCover("livestock", "/images/goats.jpg"),
      CATEGORY_META.livestock.image,
    );
  });

  it("uses a user-uploaded photo when one is present", () => {
    const uploaded = "/uploads/11111111-2222-3333-4444-555555555555.jpg";
    assert.equal(resolveCategoryCover("produce", uploaded), uploaded);
  });
});

describe("pickLatestUserListingPhoto", () => {
  const older = "/uploads/00000000-0000-0000-0000-000000000001.jpg";
  const newer = "/uploads/00000000-0000-0000-0000-000000000002.jpg";

  it("picks the most recent user photo in that category", () => {
    assert.equal(
      pickLatestUserListingPhoto("livestock", [
        {
          category: "livestock",
          imagePath: older,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
        {
          category: "livestock",
          imagePath: "/images/heifer.jpg",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
        {
          category: "livestock",
          imagePath: newer,
          createdAt: "2026-08-15T00:00:00.000Z",
        },
        {
          category: "produce",
          imagePath: "/uploads/99999999-9999-9999-9999-999999999999.jpg",
          createdAt: "2026-09-04T00:00:00.000Z",
        },
      ]),
      newer,
    );
  });

  it("restores the stock cover when the category has no user photos", () => {
    assert.equal(
      pickLatestUserListingPhoto("equipment", [
        {
          category: "equipment",
          imagePath: "/images/tractor.jpg",
          createdAt: "2026-08-01T00:00:00.000Z",
        },
      ]),
      CATEGORY_META.equipment.image,
    );
    assert.equal(pickLatestUserListingPhoto("land", []), CATEGORY_META.land.image);
  });
});

describe("coversForAllCategories", () => {
  it("returns a stock cover for every category when listings are empty", () => {
    const covers = coversForAllCategories([]);
    for (const category of CATEGORIES) {
      assert.equal(covers[category], CATEGORY_META[category].image);
    }
  });
});
