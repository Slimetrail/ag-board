import { z } from "zod";

/**
 * Shared preview/dev id from `verify.server` / `use-current-user`. Kept here so
 * this module stays free of server-only imports (tests load it with strip-types).
 */
export const SHARED_DEV_USER_ID = "dev-user";

/** Client must send this exact flag. Extra keys (e.g. another user id) are stripped. */
export const deleteAccountInput = z.object({
  confirm: z.literal(true),
});

export type DeleteAccountSql = {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
};

export type DeleteAccountResult = {
  threads: number;
  invites: number;
  notes: number;
  listings: number;
  profile: boolean;
  user: boolean;
};

/**
 * Hard-delete one account's identity and trade rows. Caller must pass the
 * **session** user id only — never a client-supplied target.
 *
 * SQL order is FK-safe (not the product checklist order):
 * threads (messages + ratings first) → invites → board notes → listings
 * (posted + drafts) → profile → Better Auth `"user"` (sessions + accounts
 * cascade). Pins/saved live in device storage, not Postgres.
 */
export async function deleteOwnAccountData(
  sql: DeleteAccountSql,
  userId: string,
): Promise<DeleteAccountResult> {
  if (!userId || userId === SHARED_DEV_USER_ID) {
    throw new Error("Only a signed-in account can be deleted.");
  }

  const authRows = await sql.query<{ id: string }>(
    `select "id" from "user" where "id" = $1 limit 1`,
    [userId],
  );
  if (!authRows[0]) {
    throw new Error("Could not find your sign-in. Nothing was deleted.");
  }

  const threadFilter = `user_a_id = $1 or user_b_id = $1
     or listing_id in (select id from listings where user_id = $1)`;

  await sql.query(
    `delete from messages
     where thread_id in (select id from conversation_threads where ${threadFilter})`,
    [userId],
  );
  await sql.query(
    `delete from connection_ratings
     where thread_id in (select id from conversation_threads where ${threadFilter})`,
    [userId],
  );
  const threads = await sql.query<{ id: number }>(
    `delete from conversation_threads where ${threadFilter} returning id`,
    [userId],
  );

  const invites = await sql.query<{ id: number }>(
    `delete from connection_invites
     where from_user_id = $1 or to_user_id = $1
        or listing_id in (select id from listings where user_id = $1)
     returning id`,
    [userId],
  );

  const notes = await sql.query<{ id: number }>(
    `delete from board_notes
     where listing_id in (select id from listings where user_id = $1)
     returning id`,
    [userId],
  );

  const listings = await sql.query<{ id: number }>(
    `delete from listings where user_id = $1 returning id`,
    [userId],
  );

  const profiles = await sql.query<{ user_id: string }>(
    `delete from profiles where user_id = $1 returning user_id`,
    [userId],
  );

  // Office claim is this user_id — drop it so a deleted neighbor cannot keep the desk.
  await sql.query(`delete from board_steward where user_id = $1`, [userId]);
  await sql.query(
    `update board_admin set user_id = null where user_id = $1`,
    [userId],
  );

  const users = await sql.query<{ id: string }>(
    `delete from "user" where "id" = $1 returning "id"`,
    [userId],
  );
  if (!users[0]) {
    throw new Error("Could not remove your sign-in. Nothing was kept half-done.");
  }

  return {
    threads: threads.length,
    invites: invites.length,
    notes: notes.length,
    listings: listings.length,
    profile: Boolean(profiles[0]),
    user: true,
  };
}
