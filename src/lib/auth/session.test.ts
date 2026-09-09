import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_COOKIE_CACHE_MAX_AGE,
  SESSION_EXPIRES_IN,
  SESSION_UPDATE_AGE,
  betterAuthSession,
} from "./session.ts";

describe("betterAuthSession", () => {
  it("uses a long sliding expiry so the same browser stays signed in", () => {
    assert.equal(SESSION_EXPIRES_IN, 60 * 60 * 24 * 365);
    assert.equal(SESSION_UPDATE_AGE, 60 * 60 * 24);
    assert.ok(SESSION_EXPIRES_IN > SESSION_UPDATE_AGE);
    assert.deepEqual(betterAuthSession, {
      expiresIn: SESSION_EXPIRES_IN,
      updateAge: SESSION_UPDATE_AGE,
      cookieCache: { enabled: true, maxAge: SESSION_COOKIE_CACHE_MAX_AGE },
    });
  });

  it("keeps the session_data cache short so it is not the login TTL", () => {
    assert.equal(SESSION_COOKIE_CACHE_MAX_AGE, 300);
    assert.ok(SESSION_COOKIE_CACHE_MAX_AGE < SESSION_UPDATE_AGE);
  });
});
