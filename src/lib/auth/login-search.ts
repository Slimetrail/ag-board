import { safeReturnTo } from "./return-to.ts";

export type LoginMode = "in" | "up";

export type LoginSearch = {
  next?: string;
  mode?: LoginMode;
};

/** Signup vs sign-in on the shared /login page. Anything else is sign-in. */
export function parseLoginMode(value: unknown): LoginMode {
  return value === "up" ? "up" : "in";
}

/** Search object for /login links and validateSearch. */
export function loginSearch(input: {
  next?: unknown;
  mode?: unknown;
}): LoginSearch {
  const next = safeReturnTo(input.next);
  const mode = parseLoginMode(input.mode);
  return {
    ...(next ? { next } : {}),
    ...(mode === "up" ? { mode: "up" as const } : {}),
  };
}
