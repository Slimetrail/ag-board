import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { withSqlTransaction } from "@/lib/db";
import {
  deleteAccountInput,
  deleteOwnAccountData,
} from "@/lib/delete-account-data";

/**
 * Delete the signed-in user's own account. Rejects when signed out (middleware)
 * or when `confirm` is not exactly true. Never accepts a target user id.
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .validator(deleteAccountInput)
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const result = await withSqlTransaction((sql) =>
      deleteOwnAccountData(sql, context.userId),
    );
    const { expireAuthCookies } = await import(
      "@/lib/auth/expire-auth-cookies.server"
    );
    expireAuthCookies();
    return { ok: true as const, ...result };
  });
