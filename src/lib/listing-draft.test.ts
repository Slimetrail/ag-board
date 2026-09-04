import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOARD_VISIBLE_SQL,
  EMPTY_LISTING_FORM,
  draftPlace,
  draftSaveInput,
  isListingFormDirty,
  listingFormFromListing,
} from "./listing-draft.ts";

describe("BOARD_VISIBLE_SQL", () => {
  it("keeps drafts off the public board", () => {
    assert.match(BOARD_VISIBLE_SQL, /available = true/);
    assert.match(BOARD_VISIBLE_SQL, /is_draft = false/);
  });

  it("is used by every public board query", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "listings.ts"),
      "utf8",
    );
    const uses = source.split("BOARD_VISIBLE_SQL").length - 1;
    assert.ok(
      uses >= 4,
      `expected list/get/similar/counts to use BOARD_VISIBLE_SQL, found ${uses}`,
    );
    assert.doesNotMatch(
      source,
      /from listings\s+where available = true\s+group by category/,
    );
  });
});

describe("isListingFormDirty", () => {
  it("treats the empty form as clean", () => {
    assert.equal(isListingFormDirty(EMPTY_LISTING_FORM), false);
  });

  it("is dirty when a field or saved draft id is set", () => {
    assert.equal(
      isListingFormDirty({ ...EMPTY_LISTING_FORM, title: "First-cut hay" }),
      true,
    );
    assert.equal(
      isListingFormDirty({ ...EMPTY_LISTING_FORM, imagePath: "/uploads/a.jpg" }),
      true,
    );
    assert.equal(
      isListingFormDirty({ ...EMPTY_LISTING_FORM, draftId: 12 }),
      true,
    );
  });
});

describe("draftSaveInput", () => {
  it("allows a partial listing so a failed photo does not block save", () => {
    const parsed = draftSaveInput.parse({
      category: "materials",
      dealType: "sale",
      title: "Hay",
    });
    assert.equal(parsed.title, "Hay");
    assert.equal(parsed.summary, "");
    assert.equal(parsed.imagePath, "");
    assert.equal(parsed.description, "");
  });

  it("rejects a title that would not fit the column", () => {
    assert.throws(() =>
      draftSaveInput.parse({
        category: "materials",
        dealType: "sale",
        title: "x".repeat(81),
      }),
    );
  });
});

describe("draftPlace", () => {
  it("stores a public county label only when the county is real", () => {
    assert.deepEqual(draftPlace("Richland", "SC"), {
      location: "Richland County",
      region: "Richland County, SC",
    });
    assert.deepEqual(draftPlace("", "SC"), { location: "", region: "" });
    assert.deepEqual(draftPlace("NotACounty", "SC"), {
      location: "",
      region: "",
    });
  });
});

describe("listingFormFromListing", () => {
  it("restores county from the stored region", () => {
    const form = listingFormFromListing({
      id: 9,
      category: "produce",
      dealType: "share",
      title: "Eggs",
      summary: "A dozen extra",
      description: "From the coop this morning, still warm.",
      priceLabel: "Free",
      quantity: "1 dozen",
      farmNote: "Leave a crate by the gate.",
      tags: "eggs",
      imagePath: "",
      region: "Lexington County, SC",
    });
    assert.equal(form.draftId, 9);
    assert.equal(form.category, "produce");
    assert.equal(form.county, "Lexington");
    assert.equal(form.state, "SC");
  });
});
