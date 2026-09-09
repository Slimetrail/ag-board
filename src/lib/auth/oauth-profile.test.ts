import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mapBrokerProfileToUser } from "./oauth-profile.ts";

describe("mapBrokerProfileToUser", () => {
  it("keeps a complete Google-like profile", () => {
    assert.deepEqual(
      mapBrokerProfileToUser({
        sub: "google-123",
        email: "Pat@Farm.sc",
        name: "Pat Farmer",
        email_verified: true,
      }),
      {
        id: "google-123",
        email: "pat@farm.sc",
        name: "Pat Farmer",
        emailVerified: true,
      },
    );
  });

  it("fills name and a synthetic email when the broker omits them (X-like)", () => {
    const mapped = mapBrokerProfileToUser({
      sub: "twitter:99",
      preferred_username: "cedar_hollow",
    });
    assert.equal(mapped.id, "twitter:99");
    assert.equal(mapped.name, "cedar_hollow");
    assert.equal(mapped.email, "twitter99@oauth.ag-board.invalid");
    assert.equal(mapped.emailVerified, false);
  });

  it("always supplies a name so Better Auth does not emit name_is_missing", () => {
    const mapped = mapBrokerProfileToUser({ id: "acct-1" });
    assert.equal(mapped.name, "acct-1");
    assert.ok(mapped.email?.endsWith("@oauth.ag-board.invalid"));
  });

  it("falls back to Neighbor when the profile has no identifier or name", () => {
    const mapped = mapBrokerProfileToUser({});
    assert.equal(mapped.name, "Neighbor");
    assert.equal(mapped.email, undefined);
    assert.equal(mapped.id, undefined);
  });

  it("does not treat a username without @ as an email", () => {
    const mapped = mapBrokerProfileToUser({
      sub: "x-1",
      preferred_username: "not-an-email",
    });
    assert.equal(mapped.email, "x-1@oauth.ag-board.invalid");
    assert.equal(mapped.name, "not-an-email");
  });
});
