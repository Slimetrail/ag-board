import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IMPROVEMENT_SUGGESTION_LABEL,
  YOUR_LISTINGS_LABEL,
  YOUR_LISTINGS_PATH,
  hamburgerNav,
} from "./nav.ts";

describe("hamburgerNav", () => {
  it("returns only the ordered hamburger items", () => {
    const items = hamburgerNav();
    assert.deepEqual(
      items.map((item) => item.label),
      [
        "The board",
        YOUR_LISTINGS_LABEL,
        "Pinned",
        "Learn",
        "About",
        IMPROVEMENT_SUGGESTION_LABEL,
      ],
    );
    assert.deepEqual(
      items.map((item) => item.to),
      ["/market", YOUR_LISTINGS_PATH, "/saved", "/learn", "/about", "/improve"],
    );
    assert.equal(YOUR_LISTINGS_LABEL, "Your listings");
    assert.equal(IMPROVEMENT_SUGGESTION_LABEL, "Improvement suggestion");
    assert.equal(
      items.filter((item) => item.label === YOUR_LISTINGS_LABEL).length,
      1,
    );
    for (const label of ["Share", "Needs", "Leases", "Skills", "Improve"]) {
      assert.equal(
        items.find((item) => item.label === label),
        undefined,
        `hamburger must not include ${label}`,
      );
    }
  });

  it("is wired into the hamburger menu and owner listings query", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const shell = readFileSync(join(here, "../components/site-shell.tsx"), "utf8");
    assert.match(shell, /hamburgerNav\(\)/);
    assert.match(shell, /YOUR_LISTINGS_PATH/);
    assert.match(shell, /lg:hidden/);
    assert.match(shell, /AuthEntryLinks/);
    assert.match(shell, /compact/);
    assert.match(shell, /Post a listing/);
    assert.match(shell, /OfficeNav/);
    assert.match(shell, /UserButton layout="menu"/);
    assert.doesNotMatch(shell, /You're Listing/);
    const hamburgerBlock = shell.slice(shell.indexOf("{open ? ("));
    assert.doesNotMatch(hamburgerBlock, /to="\/messages"/);
    assert.match(hamburgerBlock, /to="\/profile"/);
    assert.doesNotMatch(hamburgerBlock, /InviteBadge/);
    assert.doesNotMatch(hamburgerBlock, />Sign in to post</);
    const home = readFileSync(join(here, "../routes/index.tsx"), "utf8");
    assert.match(home, /SignedOut/);
    assert.match(home, /AuthEntryLinks/);
    assert.match(home, /size="lg"/);
    const listings = readFileSync(join(here, "listings.ts"), "utf8");
    assert.match(listings, /export const listOwnListings/);
    assert.match(
      listings,
      /where user_id = \$1 and is_draft = false/,
    );
  });
});
