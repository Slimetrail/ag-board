import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  LOCAL_DEV_ORIGINS,
  PUBLIC_PRODUCTION_ORIGIN,
  resolveAuthBaseURL,
  resolveTrustedOrigins,
  toHttpsOrigin,
} from "./trusted-origins.ts";

const PREVIEW_HOSTS = ["*.grok-sandbox.com"] as const;

describe("toHttpsOrigin", () => {
  it("prefixes https when the value is a bare host", () => {
    assert.equal(
      toHttpsOrigin("ag-board-jet.vercel.app"),
      "https://ag-board-jet.vercel.app",
    );
  });

  it("strips a protocol that is already included and drops a trailing slash", () => {
    assert.equal(
      toHttpsOrigin("https://ag-board-jet.vercel.app/"),
      "https://ag-board-jet.vercel.app",
    );
    assert.equal(
      toHttpsOrigin("http://preview.example.test/"),
      "http://preview.example.test",
    );
  });

  it("treats empty or whitespace as unset", () => {
    assert.equal(toHttpsOrigin(undefined), undefined);
    assert.equal(toHttpsOrigin(""), undefined);
    assert.equal(toHttpsOrigin("   "), undefined);
  });
});

describe("resolveTrustedOrigins", () => {
  it("includes the production alias when BETTER_AUTH_URL is unset (live Vercel)", () => {
    const origins = resolveTrustedOrigins({
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.ok(origins.includes(PUBLIC_PRODUCTION_ORIGIN));
    assert.ok(origins.includes("*.grok-sandbox.com"));
    assert.ok(origins.includes("https://*.grok-sandbox.com"));
    for (const local of LOCAL_DEV_ORIGINS) {
      assert.ok(origins.includes(local));
    }
  });

  it("unions Vercel system hosts when present", () => {
    const origins = resolveTrustedOrigins({
      vercelProjectProductionUrl: "ag-board-jet.vercel.app",
      vercelUrl: "ag-board-abc123-slimtrail.vercel.app",
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.ok(origins.includes("https://ag-board-jet.vercel.app"));
    assert.ok(
      origins.includes("https://ag-board-abc123-slimtrail.vercel.app"),
    );
  });

  it("keeps BETTER_AUTH_URL + local without preview wildcards", () => {
    const origins = resolveTrustedOrigins({
      betterAuthUrl: "https://custom.example",
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.ok(origins.includes("https://custom.example"));
    for (const local of LOCAL_DEV_ORIGINS) {
      assert.ok(origins.includes(local));
    }
    assert.ok(!origins.includes("*.grok-sandbox.com"));
    assert.ok(origins.includes(PUBLIC_PRODUCTION_ORIGIN));
  });

  it("deduplicates overlapping BETTER_AUTH_URL and Vercel hosts", () => {
    const origins = resolveTrustedOrigins({
      betterAuthUrl: "https://ag-board-jet.vercel.app",
      vercelProjectProductionUrl: "https://ag-board-jet.vercel.app/",
      vercelUrl: "ag-board-jet.vercel.app",
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.equal(
      origins.filter((origin) => origin === PUBLIC_PRODUCTION_ORIGIN).length,
      1,
    );
  });

  it("never produces a doubled https:// prefix", () => {
    const origins = resolveTrustedOrigins({
      vercelProjectProductionUrl: "https://ag-board-jet.vercel.app",
      vercelUrl: "https://foo.vercel.app",
      previewAllowedHosts: [],
    });
    assert.ok(!origins.some((origin) => origin.includes("https://https://")));
  });
});

describe("resolveAuthBaseURL", () => {
  it("prefers BETTER_AUTH_URL when set", () => {
    assert.equal(
      resolveAuthBaseURL({
        betterAuthUrl: "https://custom.example",
        vercelEnv: "production",
        vercelProjectProductionUrl: "ag-board-jet.vercel.app",
        previewAllowedHosts: PREVIEW_HOSTS,
      }),
      "https://custom.example",
    );
  });

  it("uses the Vercel production URL when BETTER_AUTH_URL is unset on production", () => {
    assert.equal(
      resolveAuthBaseURL({
        vercelEnv: "production",
        vercelProjectProductionUrl: "ag-board-jet.vercel.app",
        previewAllowedHosts: PREVIEW_HOSTS,
      }),
      "https://ag-board-jet.vercel.app",
    );
  });

  it("falls back to the known public host on production without system env", () => {
    assert.equal(
      resolveAuthBaseURL({
        vercelEnv: "production",
        previewAllowedHosts: PREVIEW_HOSTS,
      }),
      PUBLIC_PRODUCTION_ORIGIN,
    );
  });

  it("keeps dynamic baseURL on preview so grok-sandbox hosts still resolve", () => {
    const result = resolveAuthBaseURL({
      vercelEnv: "preview",
      vercelProjectProductionUrl: "ag-board-jet.vercel.app",
      vercelUrl: "ag-board-git-fix.vercel.app",
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.equal(typeof result, "object");
    assert.ok(result && typeof result === "object" && "allowedHosts" in result);
    assert.ok(result.allowedHosts.includes("*.grok-sandbox.com"));
    assert.ok(result.allowedHosts.includes("localhost"));
    assert.equal(result.protocol, "auto");
    assert.equal(result.fallback, "http://localhost:8080");
  });

  it("keeps dynamic baseURL locally when Vercel env is unset", () => {
    const result = resolveAuthBaseURL({
      previewAllowedHosts: PREVIEW_HOSTS,
    });
    assert.equal(typeof result, "object");
  });
});
