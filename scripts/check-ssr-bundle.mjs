#!/usr/bin/env node
/**
 * Fail the build when Nitro emits an SSR chunk that Node cannot compile.
 *
 * TanStack Start + Vite 8.2 / Rolldown can re-export an undeclared
 * `ssr_exports` namespace. `vite build` still exits 0; every request then
 * 500s with `{"error":true,"status":500,"unhandled":true}`.
 *
 * @see https://github.com/TanStack/router/issues/8031
 */
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMainModule, projectRoot } from "./with-app-env.mjs";

const SERVER_EXTS = new Set([".js", ".mjs", ".cjs"]);

export const OUTPUT_DIRS = [
  ".output/server",
  ".vercel/output/functions",
  "dist/server",
];

/** True when a file re-exports `ssr_exports` without declaring or importing it. */
export function hasUndeclaredSsrExports(source) {
  if (!/\bssr_exports\b/.test(source)) return false;
  const declared =
    /(?:var|let|const|function|class)\s+ssr_exports\b/.test(source) ||
    /export\s+(?:var|let|const|function|class)\s+ssr_exports\b/.test(source) ||
    /import\s*\{[^}]*\bssr_exports\b/.test(source) ||
    /import\s+\*\s+as\s+ssr_exports\b/.test(source);
  const reexported = /export\s*\{[^}]*\bssr_exports\b/.test(source);
  return reexported && !declared;
}

export function listServerModules(root, dirs = OUTPUT_DIRS) {
  const files = [];
  for (const dir of dirs) {
    walkModules(join(root, dir), files);
  }
  return files;
}

function walkModules(dir, files) {
  if (!existsSync(dir)) return;
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(dir, name);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkModules(path, files);
      continue;
    }
    if (SERVER_EXTS.has(extname(name))) files.push(path);
  }
}

export function scanSourceForUndeclaredExports(files) {
  const bad = [];
  for (const file of files) {
    let source;
    try {
      source = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (hasUndeclaredSsrExports(source)) bad.push(file);
  }
  return bad;
}

export function checkModulesWithNode(files, spawn = spawnSync) {
  const bad = [];
  for (const file of files) {
    const result = spawn(process.execPath, ["--check", file], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      const detail = `${result.stderr || result.stdout || ""}`.trim();
      bad.push({ file, detail });
    }
  }
  return bad;
}

export function checkSsrBundle(root = projectRoot()) {
  const files = listServerModules(root);
  if (files.length === 0) {
    return {
      ok: false,
      reason: "no-output",
      message:
        "[ssr-bundle] no server output under .output/server, .vercel/output/functions, or dist/server — run vite build first.",
    };
  }

  const undeclared = scanSourceForUndeclaredExports(files);
  const syntax = checkModulesWithNode(files);
  if (undeclared.length === 0 && syntax.length === 0) {
    return {
      ok: true,
      count: files.length,
      message: `[ssr-bundle] ${files.length} server module(s) link cleanly.`,
    };
  }

  const lines = ["[ssr-bundle] emitted server modules are invalid:"];
  for (const file of undeclared) {
    lines.push(`  undeclared ssr_exports: ${file}`);
  }
  for (const { file, detail } of syntax) {
    lines.push(`  node --check failed: ${file}`);
    if (detail) lines.push(`    ${detail.split("\n")[0]}`);
  }
  lines.push(
    "  This is TanStack Start issue #8031 (Rolldown re-exports ssr_exports).",
  );
  return { ok: false, reason: "invalid", message: lines.join("\n") };
}

if (isMainModule(import.meta.url) || process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = checkSsrBundle();
  if (result.ok) {
    console.log(result.message);
    process.exit(0);
  }
  console.error(result.message);
  process.exit(1);
}
