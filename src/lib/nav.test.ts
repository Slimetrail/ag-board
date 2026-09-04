import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  YOUR_LISTINGS_LABEL,
  YOUR_LISTINGS_PATH,
  hamburgerNav,
} from "./nav.ts";

describe("hamburgerNav", () => {
  it("places Your listings directly under The board", () => {
    const items = hamburgerNav();
    const board = items.findIndex((item) => item.label === "The board");
    assert.ok(board >= 0);
    assert.equal(items[board + 1]?.label, YOUR_LISTINGS_LABEL);
    assert.equal(items[board + 1]?.to, YOUR_LISTINGS_PATH);
    assert.notEqual(YOUR_LISTINGS_LABEL, "You're Listing");
    assert.equal(
      items.filter((item) => item.label === YOUR_LISTINGS_LABEL).length,
      1,
    );
  });

  it("is wired into the hamburger menu and owner listings query", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const shell = readFileSync(join(here, "../components/site-shell.tsx"), "utf8");
    assert.match(shell, /hamburgerNav\(\)/);
    assert.match(shell, /YOUR_LISTINGS_PATH/);
    assert.match(shell, /lg:hidden/);
    assert.doesNotMatch(shell, /You're Listing/);
    const listings = readFileSync(join(here, "listings.ts"), "utf8");
    assert.match(listings, /export const listOwnListings/);
    assert.match(
      listings,
      /where user_id = \$1 and is_draft = false/,
    );
  });
});
