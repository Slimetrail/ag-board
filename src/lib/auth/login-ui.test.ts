import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loginSearch } from "./login-search.ts";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

describe("login / signup UI is email-only", () => {
  it("does not render or invoke Google / X social sign-in", () => {
    const login = readSrc("routes/login.tsx");
    assert.doesNotMatch(login, /GROK_PROVIDERS/);
    assert.doesNotMatch(login, /Continue with/);
    assert.doesNotMatch(login, /onProvider/);
    assert.doesNotMatch(login, /\bsignIn\(/);
    assert.doesNotMatch(login, /Google or X/);
    assert.match(login, /signIn\.email/);
    assert.match(login, /signUp\.email/);
    assert.match(login, /rememberMe:\s*true/);
  });

  it("does not mention Google or X on the terms fallback", () => {
    const agree = readSrc("routes/agree.tsx");
    assert.doesNotMatch(agree, /Google or X/);
    assert.match(agree, /email and password/i);
  });

  it("labels Log out and uses a full-width menu control", () => {
    const gates = readSrc("lib/auth/gates.tsx");
    assert.match(gates, /Log out/);
    assert.match(gates, /Logging out/);
    assert.match(gates, /layout === "menu"/);
    assert.match(gates, /signOut\(\)/);
    assert.doesNotMatch(gates, /Sign out/);
    const shell = readSrc("components/site-shell.tsx");
    assert.match(shell, /UserButton layout="menu"/);
  });

  it("keeps email sign-in and sign-up search modes", () => {
    assert.deepEqual(loginSearch({ mode: "in" }), {});
    assert.deepEqual(loginSearch({ mode: "up" }), { mode: "up" });
    assert.deepEqual(loginSearch({ mode: "up", next: "/post" }), {
      mode: "up",
      next: "/post",
    });
  });
});
