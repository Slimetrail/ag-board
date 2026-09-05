import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  checkModulesWithNode,
  checkSsrBundle,
  hasUndeclaredSsrExports,
  listServerModules,
  scanSourceForUndeclaredExports,
} from "./check-ssr-bundle.mjs";

test("detects a re-export of ssr_exports with no local binding", () => {
  assert.equal(
    hasUndeclaredSsrExports(
      "var server_exports = {};\nexport { ssr_exports as a, server_exports as b };\n",
    ),
    true,
  );
});

test("accepts a chunk that declares ssr_exports before exporting it", () => {
  assert.equal(
    hasUndeclaredSsrExports(
      "var ssr_exports = { handler: () => {} };\nexport { ssr_exports as a };\n",
    ),
    false,
  );
});

test("accepts a chunk that imports ssr_exports and re-exports it", () => {
  assert.equal(
    hasUndeclaredSsrExports(
      'import { ssr_exports } from "./ssr.mjs";\nexport { ssr_exports as a };\n',
    ),
    false,
  );
});

test("ignores files that never mention ssr_exports", () => {
  assert.equal(hasUndeclaredSsrExports("export const ok = 1;\n"), false);
});

test("lists .mjs modules under the known server output dirs", () => {
  const root = mkdtempSync(join(tmpdir(), "ssr-bundle-"));
  mkdirSync(join(root, ".output", "server", "_ssr"), { recursive: true });
  const good = join(root, ".output", "server", "_ssr", "ssr.mjs");
  writeFileSync(good, "export const ok = 1;\n");
  writeFileSync(join(root, ".output", "server", "readme.txt"), "skip\n");
  assert.deepEqual(listServerModules(root), [good]);
});

test("scan reports the undeclared-export file", () => {
  const root = mkdtempSync(join(tmpdir(), "ssr-bundle-"));
  const file = join(root, "ssr2.mjs");
  writeFileSync(
    file,
    "var server_exports = {};\nexport { ssr_exports as a, server_exports as b };\n",
  );
  assert.deepEqual(scanSourceForUndeclaredExports([file]), [file]);
});

test("node --check flags a module with an undeclared export binding", () => {
  const root = mkdtempSync(join(tmpdir(), "ssr-bundle-"));
  const file = join(root, "ssr2.mjs");
  writeFileSync(
    file,
    "var server_exports = {};\nexport { ssr_exports as a, server_exports as b };\n",
  );
  const bad = checkModulesWithNode([file]);
  assert.equal(bad.length, 1);
  assert.equal(bad[0]?.file, file);
  assert.match(bad[0]?.detail ?? "", /ssr_exports|not defined/i);
});

test("checkSsrBundle fails when no server output exists", () => {
  const root = mkdtempSync(join(tmpdir(), "ssr-bundle-"));
  const result = checkSsrBundle(root);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "no-output");
});
