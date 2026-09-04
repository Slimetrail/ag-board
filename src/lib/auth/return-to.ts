/** In-app path we may send someone to after sign-in. */
export function safeReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/")) return undefined;
  if (trimmed.startsWith("//")) return undefined;
  if (trimmed.includes("://") || trimmed.includes("\\") || /[\s]/.test(trimmed)) {
    return undefined;
  }
  const path = trimmed.split("?")[0]?.split("#")[0] ?? "";
  if (path === "/login" || path === "/agree") return undefined;
  if (path.startsWith("/api")) return undefined;
  if (!/^\/[A-Za-z0-9/_-]*$/.test(path)) return undefined;
  return path;
}

/** Terms gate after every sign-in; keep a safe `next` so listings (and similar) resume. */
export function afterAuthPath(next?: string): string {
  const dest = safeReturnTo(next);
  return dest ? `/agree?next=${encodeURIComponent(dest)}` : "/agree";
}
