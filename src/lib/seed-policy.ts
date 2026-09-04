/**
 * Seed listings only on the ephemeral PGLite board (local / preview with no
 * DATABASE_URL). Neon / production must never re-insert seeds — otherwise a
 * soft-hide (available = false) is undone on the next request or redeploy.
 *
 * `source` matches `@/lib/db`'s `dbSource` (`"neon"` when DATABASE_URL is set).
 */
export function shouldSeedListings(source: "neon" | "pglite"): boolean {
  return source === "pglite";
}
