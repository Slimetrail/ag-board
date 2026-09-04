import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { afterAuthPath, safeReturnTo } from "./return-to.ts";

describe("safeReturnTo", () => {
  it("keeps the listings page and other in-app paths", () => {
    assert.equal(safeReturnTo("/listings"), "/listings");
    assert.equal(safeReturnTo("/profile"), "/profile");
    assert.equal(safeReturnTo("/post"), "/post");
  });

  it("drops open redirects and auth loops", () => {
    assert.equal(safeReturnTo("//evil.example"), undefined);
    assert.equal(safeReturnTo("https://evil.example"), undefined);
    assert.equal(safeReturnTo("/login"), undefined);
    assert.equal(safeReturnTo("/agree"), undefined);
    assert.equal(safeReturnTo("/api/auth/ok"), undefined);
    assert.equal(safeReturnTo("/listings\n/login"), undefined);
  });
});

describe("afterAuthPath", () => {
  it("sends a safe next through the terms page", () => {
    assert.equal(afterAuthPath("/listings"), "/agree?next=%2Flistings");
    assert.equal(afterAuthPath("//evil.example"), "/agree");
    assert.equal(afterAuthPath(), "/agree");
  });
});
