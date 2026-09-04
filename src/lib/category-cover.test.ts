import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { join } from "node:path";
import { CATEGORIES, CATEGORY_META } from "./catalog.ts";
import {
  isStockCatalogImage,
  resolveCategoryCover,
} from "./category-cover.ts";

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
  });
});

describe("resolveCategoryCover", () => {
  const stock = "/images/heifer.jpg";
  const olderUpload = "/uploads/aaaa-older.jpg";
  const newerUpload = "/uploads/bbbb-newer.jpg";

  it("uses the stock CATEGORY_META image when the category has no listings", () => {
    assert.equal(resolveCategoryCover(stock, []), stock);
  });

  it("keeps the stock image when visible listings only use /images/ photos", () => {
    assert.equal(
      resolveCategoryCover(stock, ["/images/goats.jpg", "/images/nubian.jpg"]),
      stock,
    );
  });

  it("prefers the most recent listing image that is not a stock /images/ path", () => {
    assert.equal(
      resolveCategoryCover(stock, [
        newerUpload,
        "/images/goats.jpg",
        olderUpload,
      ]),
      newerUpload,
    );
  });

  it("skips a newer stock photo to reach an older user upload", () => {
    assert.equal(
      resolveCategoryCover(stock, ["/images/goats.jpg", olderUpload]),
      olderUpload,
    );
  });

  it("restores the stock image when custom photos are gone again", () => {
    const withPosts = resolveCategoryCover(stock, [newerUpload]);
    assert.equal(withPosts, newerUpload);
    const emptyAgain = resolveCategoryCover(stock, []);
    assert.equal(emptyAgain, stock);
  });

  it("ignores blank paths", () => {
    assert.equal(resolveCategoryCover(stock, ["", newerUpload]), newerUpload);
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
