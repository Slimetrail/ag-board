import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loginSearch, parseLoginMode } from "./login-search.ts";

describe("parseLoginMode", () => {
  it("treats up as signup and everything else as sign-in", () => {
    assert.equal(parseLoginMode("up"), "up");
    assert.equal(parseLoginMode("in"), "in");
    assert.equal(parseLoginMode(undefined), "in");
    assert.equal(parseLoginMode("signup"), "in");
  });
});

describe("loginSearch", () => {
  it("omits default sign-in mode and keeps a safe next", () => {
    assert.deepEqual(loginSearch({ mode: "in", next: "/listings" }), {
      next: "/listings",
    });
    assert.deepEqual(loginSearch({ mode: "up" }), { mode: "up" });
    assert.deepEqual(loginSearch({ mode: "up", next: "/post" }), {
      next: "/post",
      mode: "up",
    });
  });

  it("drops open redirects", () => {
    assert.deepEqual(loginSearch({ next: "https://evil.example", mode: "up" }), {
      mode: "up",
    });
  });

  it("keeps a safe OAuth error code and drops junk", () => {
    assert.deepEqual(loginSearch({ error: "name_is_missing", next: "/listings" }), {
      next: "/listings",
      error: "name_is_missing",
    });
    assert.deepEqual(loginSearch({ error: "https://evil.example" }), {});
  });
});
