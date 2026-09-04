import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldSeedListings } from "./seed-policy.ts";

describe("shouldSeedListings", () => {
  it("skips seed on Neon / production (DATABASE_URL set)", () => {
    assert.equal(shouldSeedListings("neon"), false);
  });

  it("keeps seed on local / preview PGLite", () => {
    assert.equal(shouldSeedListings("pglite"), true);
  });
});
