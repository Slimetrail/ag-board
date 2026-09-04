import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { CATEGORIES, CATEGORY_META } from "./catalog.ts";
import {
  isStockCatalogImage,
  resolveCategoryCover,
  selectRotatedUserCover,
  userListingPhotos,
  utcFiveDayEpoch,
} from "./category-cover.ts";

function utcDate(year: number, month: number, day: number, hour = 0) {
  return new Date(Date.UTC(year, month - 1, day, hour));
}

describe("isStockCatalogImage", () => {
  it("treats library paths under /images/ as stock", () => {
    assert.equal(isStockCatalogImage("/images/heifer.jpg"), true);
    assert.equal(isStockCatalogImage("/images/garden-bed.jpg"), true);
  });

  it("treats user uploads as custom photos", () => {
    assert.equal(
      isStockCatalogImage("/uploads/2f1c8e0a-9b3d-4c11-8a7e-0d1f2a3b4c5d.jpg"),
      false,
    );
    assert.equal(
      isStockCatalogImage(
        "https://abc123xyz.public.blob.vercel-storage.com/uploads/2f1c8e0a-9b3d-4c11-8a7e-0d1f2a3b4c5d.jpg",
      ),
      false,
    );
  });
});

describe("utcFiveDayEpoch", () => {
  it("floors to UTC calendar days so late-evening UTC stays in the same window", () => {
    assert.equal(utcFiveDayEpoch(utcDate(1970, 1, 1, 0)), 0);
    assert.equal(utcFiveDayEpoch(utcDate(1970, 1, 5, 23)), 0);
    assert.equal(utcFiveDayEpoch(utcDate(1970, 1, 6, 0)), 1);
  });
});

describe("userListingPhotos", () => {
  it("drops stock and blank paths, uniques, and sorts for a stable cycle", () => {
    assert.deepEqual(
      userListingPhotos([
        "/uploads/c.jpg",
        "/images/heifer.jpg",
        "",
        "/uploads/a.jpg",
        "/uploads/c.jpg",
      ]),
      ["/uploads/a.jpg", "/uploads/c.jpg"],
    );
  });
});

describe("resolveCategoryCover", () => {
  const stock = "/images/heifer.jpg";
  const first = "/uploads/aaaa.jpg";
  const second = "/uploads/bbbb.jpg";
  const third = "/uploads/cccc.jpg";
  const photos = [third, first, second];

  it("uses the stock CATEGORY_META image when the category has no listings", () => {
    assert.equal(resolveCategoryCover(stock, []), stock);
    assert.equal(selectRotatedUserCover("livestock", [], utcDate(1970, 1, 1)), null);
  });

  it("keeps the stock image when visible listings only use /images/ photos", () => {
    assert.equal(
      resolveCategoryCover(stock, ["/images/goats.jpg", "/images/nubian.jpg"]),
      stock,
    );
  });

  it("uses a user listing photo instead of stock when any remain", () => {
    const cover = resolveCategoryCover(stock, [first], utcDate(1970, 1, 1));
    assert.equal(cover, first);
    assert.notEqual(cover, stock);
  });

  it("keeps the same user photo for days 0–4 of a 5-day UTC window", () => {
    const day0 = resolveCategoryCover(stock, photos, utcDate(1970, 1, 1, 0));
    const day4 = resolveCategoryCover(stock, photos, utcDate(1970, 1, 5, 23));
    assert.equal(day0, first);
    assert.equal(day4, first);
  });

  it("advances to the next sorted photo on day 5", () => {
    const day4 = resolveCategoryCover(stock, photos, utcDate(1970, 1, 5));
    const day5 = resolveCategoryCover(stock, photos, utcDate(1970, 1, 6));
    assert.equal(day4, first);
    assert.equal(day5, second);
    assert.notEqual(day5, day4);
  });

  it("wraps back to the first sorted photo after the last slot", () => {
    assert.equal(
      resolveCategoryCover(stock, photos, utcDate(1970, 1, 6)),
      second,
    );
    assert.equal(
      resolveCategoryCover(stock, photos, utcDate(1970, 1, 11)),
      third,
    );
    assert.equal(
      resolveCategoryCover(stock, photos, utcDate(1970, 1, 16)),
      first,
    );
  });

  it("is deterministic for the same category, photo set, and UTC window", () => {
    const shuffled = [second, third, first];
    const a = resolveCategoryCover(stock, photos, utcDate(2026, 9, 4), "livestock");
    const b = resolveCategoryCover(
      stock,
      shuffled,
      utcDate(2026, 9, 4, 18),
      "livestock",
    );
    assert.equal(a, b);
  });

  it("restores the stock image when custom photos are gone again", () => {
    const withPosts = resolveCategoryCover(stock, [first], utcDate(1970, 1, 1));
    assert.equal(withPosts, first);
    const emptyAgain = resolveCategoryCover(stock, []);
    assert.equal(emptyAgain, stock);
  });

  it("ignores blank paths", () => {
    assert.equal(
      resolveCategoryCover(stock, ["", first], utcDate(1970, 1, 1)),
      first,
    );
  });
});

describe("stock category files", () => {
  it("leaves every CATEGORY_META image on disk under public/images", async () => {
    for (const category of CATEGORIES) {
      const image = CATEGORY_META[category].image;
      assert.equal(image.startsWith("/images/"), true);
      await access(join(process.cwd(), "public", image));
    }
  });
});
