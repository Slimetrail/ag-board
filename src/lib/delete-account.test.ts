import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pairUserIds } from "./connect-helpers.ts";
import {
  SHARED_DEV_USER_ID,
  deleteAccountInput,
  deleteOwnAccountData,
  type DeleteAccountSql,
} from "./delete-account-data.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function sqlFile(name: string) {
  return readFileSync(join(root, "migrations", name), "utf8");
}

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), "utf8");
}

function asSql(db: PGlite): DeleteAccountSql {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const result = await db.query<T>(text, params);
      return result.rows;
    },
  };
}

async function withDb(run: (db: PGlite, sql: DeleteAccountSql) => Promise<void>) {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(sqlFile("0001_auth.sql"));
  await db.exec(sqlFile("0002_listings.sql"));
  await db.exec(sqlFile("0004_listing_user.sql"));
  await db.exec(sqlFile("0005_profiles.sql"));
  await db.exec(sqlFile("0007_office.sql"));
  await db.exec(sqlFile("0009_admin.sql"));
  await db.exec(sqlFile("0011_admin_user.sql"));
  await db.exec(sqlFile("0012_messages_ratings.sql"));
  await db.exec(sqlFile("0013_listing_drafts.sql"));
  await run(db, asSql(db));
  await db.close();
}

async function insertAuthUser(db: PGlite, id: string, email: string) {
  await db.query(
    `insert into "user" ("id", "name", "email", "emailVerified")
     values ($1, $2, $3, true)`,
    [id, id, email],
  );
  await db.query(
    `insert into "session" ("id", "expiresAt", "token", "createdAt", "updatedAt", "userId")
     values ($1, now() + interval '1 day', $2, now(), now(), $3)`,
    [`session-${id}`, `tok-${id}`, id],
  );
  await db.query(
    `insert into "account" ("id", "accountId", "providerId", "userId", "createdAt", "updatedAt")
     values ($1, $2, 'credential', $3, now(), now())`,
    [`account-${id}`, id, id],
  );
}

async function insertProfile(db: PGlite, id: string, username: string) {
  await db.query(
    `insert into profiles (user_id, username, display_name, email)
     values ($1, $2, $3, $4)`,
    [id, username, username, `${username}@farm.test`],
  );
}

async function insertListing(
  db: PGlite,
  opts: { slug: string; userId: string; draft?: boolean },
) {
  await db.query(
    `insert into listings (
       slug, category, deal_type, title, summary, description, price_label,
       quantity, location, region, farm_name, farm_note, image_path, user_id,
       is_draft
     ) values (
       $1, 'produce', 'sell', 'Hay', 'Square bales', 'Square bales', 'trade',
       '20', 'Anderson', 'Anderson, SC', 'Crossroads', '', '/hay.jpg', $2, $3
     )`,
    [opts.slug, opts.userId, Boolean(opts.draft)],
  );
  const rows = await db.query<{ id: number }>(
    `select id from listings where slug = $1`,
    [opts.slug],
  );
  return rows.rows[0]!.id;
}

describe("deleteAccountInput", () => {
  it("requires confirm true and strips a client-supplied user id", () => {
    assert.throws(() => deleteAccountInput.parse({}));
    assert.throws(() => deleteAccountInput.parse({ confirm: false }));
    assert.throws(() => deleteAccountInput.parse({ confirm: "true" }));
    assert.deepEqual(deleteAccountInput.parse({ confirm: true }), {
      confirm: true,
    });
    const parsed = deleteAccountInput.parse({
      confirm: true,
      userId: "someone-else",
    });
    assert.deepEqual(parsed, { confirm: true });
    assert.equal("userId" in parsed, false);
  });
});

describe("deleteOwnAccountData", () => {
  it("rejects the shared preview user and a missing auth row without wiping", async () => {
    await withDb(async (db, sql) => {
      await insertAuthUser(db, "ben", "ben@farm.test");
      await insertProfile(db, "ben", "ben");
      await insertListing(db, { slug: "ben-hay", userId: "ben" });

      await assert.rejects(
        () => deleteOwnAccountData(sql, SHARED_DEV_USER_ID),
        /signed-in account/,
      );
      await assert.rejects(
        () => deleteOwnAccountData(sql, "ghost"),
        /Could not find your sign-in/,
      );
      await assert.rejects(() => deleteOwnAccountData(sql, ""), /signed-in/);

      const left = await db.query<{ n: number }>(
        `select count(*)::int as n from listings where user_id = 'ben'`,
      );
      assert.equal(left.rows[0]?.n, 1);
      const users = await db.query<{ n: number }>(
        `select count(*)::int as n from "user" where "id" = 'ben'`,
      );
      assert.equal(users.rows[0]?.n, 1);
    });
  });

  it("hard-deletes only the session user and leaves the neighbor", async () => {
    await withDb(async (db, sql) => {
      await insertAuthUser(db, "ann", "ann@farm.test");
      await insertAuthUser(db, "ben", "ben@farm.test");
      await insertProfile(db, "ann", "ann");
      await insertProfile(db, "ben", "ben");
      const annListing = await insertListing(db, {
        slug: "ann-hay",
        userId: "ann",
      });
      await insertListing(db, { slug: "ann-draft", userId: "ann", draft: true });
      const benListing = await insertListing(db, {
        slug: "ben-eggs",
        userId: "ben",
      });

      await db.query(
        `insert into board_notes (listing_id, farm_name, body)
         values ($1, 'Ann', 'Still have six bales.')`,
        [annListing],
      );
      await db.query(
        `insert into board_notes (listing_id, farm_name, body)
         values ($1, 'Ben', 'Dozen is spoken for.')`,
        [benListing],
      );
      await db.query(
        `insert into board_steward (user_id) values ('ann')`,
      );

      await db.query(
        `insert into connection_invites (from_user_id, to_user_id, listing_id, status)
         values ('ann', 'ben', $1, 'accepted')`,
        [annListing],
      );
      const invite = await db.query<{ id: number }>(
        `select id from connection_invites where from_user_id = 'ann'`,
      );
      const [a, b] = pairUserIds("ann", "ben");
      await db.query(
        `insert into conversation_threads (invite_id, listing_id, user_a_id, user_b_id)
         values ($1, $2, $3, $4)`,
        [invite.rows[0]!.id, annListing, a, b],
      );
      await db.query(
        `insert into messages (thread_id, sender_user_id, body)
         values (1, 'ann', 'Saturday after chores.')`,
      );
      await db.query(
        `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
         values (1, 'ann', 'ben', 5)`,
      );

      const result = await deleteOwnAccountData(sql, "ann");
      assert.equal(result.user, true);
      assert.equal(result.profile, true);
      assert.equal(result.listings, 2);
      assert.ok(result.threads >= 1);
      assert.ok(result.invites >= 1);
      assert.ok(result.notes >= 1);

      const annGone = await db.query<{ n: number }>(
        `select count(*)::int as n from "user" where "id" = 'ann'`,
      );
      assert.equal(annGone.rows[0]?.n, 0);
      const annSession = await db.query<{ n: number }>(
        `select count(*)::int as n from "session" where "userId" = 'ann'`,
      );
      assert.equal(annSession.rows[0]?.n, 0);
      const annAccount = await db.query<{ n: number }>(
        `select count(*)::int as n from "account" where "userId" = 'ann'`,
      );
      assert.equal(annAccount.rows[0]?.n, 0);
      const annProfile = await db.query<{ n: number }>(
        `select count(*)::int as n from profiles where user_id = 'ann'`,
      );
      assert.equal(annProfile.rows[0]?.n, 0);
      const annListings = await db.query<{ n: number }>(
        `select count(*)::int as n from listings where user_id = 'ann'`,
      );
      assert.equal(annListings.rows[0]?.n, 0);
      const threads = await db.query<{ n: number }>(
        `select count(*)::int as n from conversation_threads`,
      );
      assert.equal(threads.rows[0]?.n, 0);
      const messages = await db.query<{ n: number }>(
        `select count(*)::int as n from messages`,
      );
      assert.equal(messages.rows[0]?.n, 0);
      const ratings = await db.query<{ n: number }>(
        `select count(*)::int as n from connection_ratings`,
      );
      assert.equal(ratings.rows[0]?.n, 0);
      const invites = await db.query<{ n: number }>(
        `select count(*)::int as n from connection_invites`,
      );
      assert.equal(invites.rows[0]?.n, 0);
      const steward = await db.query<{ n: number }>(
        `select count(*)::int as n from board_steward where user_id = 'ann'`,
      );
      assert.equal(steward.rows[0]?.n, 0);

      const benUser = await db.query<{ n: number }>(
        `select count(*)::int as n from "user" where "id" = 'ben'`,
      );
      assert.equal(benUser.rows[0]?.n, 1);
      const benProfile = await db.query<{ n: number }>(
        `select count(*)::int as n from profiles where user_id = 'ben'`,
      );
      assert.equal(benProfile.rows[0]?.n, 1);
      const benListings = await db.query<{ n: number }>(
        `select count(*)::int as n from listings where user_id = 'ben'`,
      );
      assert.equal(benListings.rows[0]?.n, 1);
      const benNotes = await db.query<{ n: number }>(
        `select count(*)::int as n from board_notes where listing_id = $1`,
        [benListing],
      );
      assert.equal(benNotes.rows[0]?.n, 1);
      const benSession = await db.query<{ n: number }>(
        `select count(*)::int as n from "session" where "userId" = 'ben'`,
      );
      assert.equal(benSession.rows[0]?.n, 1);
    });
  });
});

describe("delete account wiring", () => {
  it("only acts on the session user and requires confirm", () => {
    const server = readSrc("lib/delete-account.ts");
    assert.match(server, /authMiddleware/);
    assert.match(server, /deleteAccountInput/);
    assert.match(server, /context\.userId/);
    assert.match(server, /withSqlTransaction/);
    assert.match(server, /expireAuthCookies/);
    assert.doesNotMatch(server, /userId:\s*z\./);
    assert.doesNotMatch(server, /data\.userId/);

    const data = readSrc("lib/delete-account-data.ts");
    assert.match(data, /confirm:\s*z\.literal\(true\)/);
    assert.match(data, /delete from "user" where "id" = \$1/);
    assert.match(data, /delete from profiles where user_id = \$1/);
    assert.match(data, /delete from listings where user_id = \$1/);
    assert.match(data, /from_user_id = \$1 or to_user_id = \$1/);
    assert.match(data, /delete from conversation_threads/);
    assert.match(data, /delete from messages/);
    assert.match(data, /delete from connection_ratings/);
    assert.doesNotMatch(data, /delete from listings where user_id <>/);
  });

  it("puts Delete account on the profile with a confirm step, then signs out", () => {
    const profile = readSrc("routes/profile.tsx");
    assert.match(profile, /DeleteAccountSection/);
    assert.doesNotMatch(profile, /deleteOwnAccount\(\{ data: \{ userId/);

    const ui = readSrc("components/delete-account-section.tsx");
    assert.match(ui, /Delete account/);
    assert.match(ui, /role="dialog"/);
    assert.match(ui, /cannot[\s\S]*sign in again/i);
    assert.match(ui, /confirm:\s*true/);
    assert.match(ui, /signOut\("\/"\)/);
    assert.match(ui, /clearAccountLocalState/);
    assert.match(ui, /Keep my account/);
    assert.match(ui, /isDevFallback/);
    assert.doesNotMatch(ui, /userId:/);
  });
});
