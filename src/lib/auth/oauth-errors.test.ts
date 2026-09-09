import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isOAuthErrorCode,
  oauthErrorMessage,
  parseOAuthErrorCode,
} from "./oauth-errors.ts";

describe("parseOAuthErrorCode", () => {
  it("keeps Better Auth callback codes", () => {
    assert.equal(parseOAuthErrorCode("name_is_missing"), "name_is_missing");
    assert.equal(parseOAuthErrorCode("oAuth_code_missing"), "oAuth_code_missing");
    assert.equal(
      parseOAuthErrorCode("email_doesn't_match"),
      "email_doesn't_match",
    );
  });

  it("drops empty, oversized, or unsafe values", () => {
    assert.equal(parseOAuthErrorCode(""), undefined);
    assert.equal(parseOAuthErrorCode("  "), undefined);
    assert.equal(parseOAuthErrorCode("has space"), undefined);
    assert.equal(parseOAuthErrorCode("/login"), undefined);
    assert.equal(parseOAuthErrorCode("https://evil.example"), undefined);
    assert.equal(parseOAuthErrorCode(1), undefined);
  });
});

describe("oauthErrorMessage", () => {
  it("never returns the raw machine code", () => {
    const message = oauthErrorMessage("name_is_missing");
    assert.ok(message);
    assert.doesNotMatch(message, /name_is_missing/);
    assert.match(message, /email and password/i);
  });

  it("humanizes token-exchange and missing-profile failures", () => {
    assert.match(
      oauthErrorMessage("oauth_code_verification_failed") ?? "",
      /did not finish/i,
    );
    assert.match(oauthErrorMessage("email_is_missing") ?? "", /email/i);
    assert.match(oauthErrorMessage("invalid_client") ?? "", /email and password/i);
  });

  it("uses a generic sentence for unknown codes instead of echoing them", () => {
    const message = oauthErrorMessage("totally_new_code");
    assert.equal(
      message,
      "That sign-in did not finish. Use email and password below.",
    );
  });

  it("returns null for empty input and ordinary sentences", () => {
    assert.equal(oauthErrorMessage(undefined), null);
    assert.equal(oauthErrorMessage(""), null);
    assert.equal(oauthErrorMessage("Pop-up blocked — allow pop-ups for sign-in"), null);
    assert.equal(oauthErrorMessage("Sign-in was cancelled or failed"), null);
  });
});

describe("isOAuthErrorCode", () => {
  it("accepts underscore codes and rejects sentences", () => {
    assert.equal(isOAuthErrorCode("access_denied"), true);
    assert.equal(isOAuthErrorCode("Sign-in failed"), false);
  });
});
