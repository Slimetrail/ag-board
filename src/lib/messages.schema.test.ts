import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pairUserIds } from "./connect-helpers.ts";
import {
  BOARD_VISIBLE_SQL,
  UNPUBLISH_LISTING_SQL,
} from "./listing-draft.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function sqlFile(name: string) {
  return readFileSync(join(root, "migrations", name), "utf8");
}

async function withDb(run: (db: PGlite) => Promise<void>) {
  const db = new PGlite();
  await db.waitReady;
  await db.exec(sqlFile("0002_listings.sql"));
  await db.exec(sqlFile("0005_profiles.sql"));
  await db.exec(sqlFile("0012_messages_ratings.sql"));
  await run(db);
  await db.close();
}

describe("0012_messages_ratings", () => {
  it("applies on top of listings and profiles and keeps one thread per pair", async () => {
    await withDb(async (db) => {
      await db.query(
        `insert into connection_invites (from_user_id, to_user_id, status)
         values ('ann', 'ben', 'accepted')`,
      );
      const invite = await db.query<{ id: number }>(
        `select id from connection_invites limit 1`,
      );
      const [a, b] = pairUserIds("ben", "ann");
      await db.query(
        `insert into conversation_threads (invite_id, user_a_id, user_b_id)
         values ($1, $2, $3)`,
        [invite.rows[0]!.id, a, b],
      );
      await db.query(
        `insert into messages (thread_id, sender_user_id, body)
         values (1, 'ann', 'Saturday after chores works.')`,
      );
      await db.query(
        `update conversation_threads
         set deal_done_at = now(), deal_done_by = 'ben'
         where id = 1`,
      );
      await db.query(
        `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
         values (1, 'ann', 'ben', 5), (1, 'ben', 'ann', 4)`,
      );

      const avg = await db.query<{ avg: string | number; n: number }>(
        `select avg(stars) as avg, count(*)::int as n
         from connection_ratings where rated_user_id = 'ben'`,
      );
      assert.equal(Number(avg.rows[0]!.avg), 5);
      assert.equal(avg.rows[0]!.n, 1);

      await assert.rejects(
        () =>
          db.query(
            `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
             values (1, 'ann', 'ben', 3)`,
          ),
        /duplicate|unique/i,
      );

      await assert.rejects(
        () =>
          db.query(
            `insert into conversation_threads (user_a_id, user_b_id)
             values ($1, $2)`,
            [a, b],
          ),
        /duplicate|unique/i,
      );

      const asAnn = await db.query<{ body: string; sender_user_id: string }>(
        `select m.body, m.sender_user_id
         from messages m
         join conversation_threads t on t.id = m.thread_id
         where t.id = 1 and (t.user_a_id = $1 or t.user_b_id = $1)
         order by m.id`,
        ["ann"],
      );
      const asBen = await db.query<{ body: string; sender_user_id: string }>(
        `select m.body, m.sender_user_id
         from messages m
         join conversation_threads t on t.id = m.thread_id
         where t.id = 1 and (t.user_a_id = $1 or t.user_b_id = $1)
         order by m.id`,
        ["ben"],
      );
      assert.deepEqual(asAnn.rows, asBen.rows);
      assert.equal(asAnn.rows[0]?.body, "Saturday after chores works.");
      assert.equal(asAnn.rows[0]?.sender_user_id, "ann");
    });
  });
});

describe("listing owner thread list and deal pending", () => {
  it("shows the same listing thread to owner and visitor, then pending before done", async () => {
    const db = new PGlite();
    await db.waitReady;
    await db.exec(sqlFile("0002_listings.sql"));
    await db.exec(sqlFile("0004_listing_user.sql"));
    await db.exec(sqlFile("0005_profiles.sql"));
    await db.exec(sqlFile("0012_messages_ratings.sql"));
    await db.exec(sqlFile("0017_deal_pending.sql"));

    await db.query(
      `insert into listings (
         slug, category, deal_type, title, summary, description, price_label,
         quantity, location, region, farm_name, farm_note, image_path, user_id
       ) values (
         'eggs-ab12', 'produce', 'sell', 'Eggs', 'Dozen', 'Dozen', 'trade',
         '1 dozen', 'Anderson', 'Anderson, SC', 'Crossroads', '', '/egg.jpg', 'wife'
       )`,
    );
    await db.query(
      `insert into connection_invites (from_user_id, to_user_id, listing_id, status)
       values ('husband', 'wife', 1, 'accepted')`,
    );
    const invite = await db.query<{ id: number }>(
      `select id from connection_invites limit 1`,
    );
    const [a, b] = pairUserIds("husband", "wife");
    await db.query(
      `insert into conversation_threads (invite_id, listing_id, user_a_id, user_b_id)
       values ($1, 1, $2, $3)`,
      [invite.rows[0]!.id, a, b],
    );
    await db.query(
      `insert into messages (thread_id, sender_user_id, body)
       values (1, 'husband', 'Hi')`,
    );

    const ownerList = await db.query<{ id: number; last_body: string }>(
      `select t.id, m.body as last_body
       from conversation_threads t
       join messages m on m.thread_id = t.id
       where (t.user_a_id = $1 or t.user_b_id = $1)
         and (
           t.listing_id = $2
           or t.invite_id in (select id from connection_invites where listing_id = $2)
         )`,
      ["wife", 1],
    );
    const visitorList = await db.query<{ id: number }>(
      `select t.id from conversation_threads t
       where (t.user_a_id = $1 or t.user_b_id = $1)
         and t.listing_id = 1`,
      ["husband"],
    );
    assert.equal(ownerList.rows[0]?.id, visitorList.rows[0]?.id);
    assert.equal(ownerList.rows[0]?.last_body, "Hi");

    await db.query(
      `update conversation_threads
       set deal_pending_at = now(), deal_pending_by = 'wife'
       where id = 1`,
    );
    const pending = await db.query<{ deal_pending_by: string; deal_done_at: string | null }>(
      `select deal_pending_by, deal_done_at from conversation_threads where id = 1`,
    );
    assert.equal(pending.rows[0]?.deal_pending_by, "wife");
    assert.equal(pending.rows[0]?.deal_done_at, null);

    await db.query(
      `update conversation_threads
       set deal_done_at = now(), deal_done_by = 'wife'
       where id = 1`,
    );
    await db.query(
      `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
       values (1, 'wife', 'husband', 5), (1, 'husband', 'wife', 4)`,
    );
    const ratings = await db.query<{ n: number }>(
      `select count(*)::int as n from connection_ratings where thread_id = 1`,
    );
    assert.equal(ratings.rows[0]?.n, 2);

    await db.close();
  });

  it("unpublishes the listing from the board after Deal done, ratings still unlock", async () => {
    const db = new PGlite();
    await db.waitReady;
    await db.exec(sqlFile("0002_listings.sql"));
    await db.exec(sqlFile("0004_listing_user.sql"));
    await db.exec(sqlFile("0005_profiles.sql"));
    await db.exec(sqlFile("0010_deciding.sql"));
    await db.exec(sqlFile("0012_messages_ratings.sql"));
    await db.exec(sqlFile("0013_listing_drafts.sql"));
    await db.exec(sqlFile("0017_deal_pending.sql"));

    await db.query(
      `insert into listings (
         slug, category, deal_type, title, summary, description, price_label,
         quantity, location, region, farm_name, farm_note, image_path, user_id,
         available, is_draft, published_at, deciding_at
       ) values (
         'eggs-ab12', 'produce', 'sell', 'Eggs', 'Dozen', 'Dozen', 'trade',
         '1 dozen', 'Anderson', 'Anderson, SC', 'Crossroads', '', '/egg.jpg', 'wife',
         true, false, now(), now()
       )`,
    );

    const before = await db.query<{ n: number }>(
      `select count(*)::int as n from listings where ${BOARD_VISIBLE_SQL}`,
    );
    assert.equal(before.rows[0]?.n, 1);

    await db.query(
      `insert into connection_invites (from_user_id, to_user_id, listing_id, status)
       values ('husband', 'wife', 1, 'accepted')`,
    );
    const invite = await db.query<{ id: number }>(
      `select id from connection_invites limit 1`,
    );
    const [a, b] = pairUserIds("husband", "wife");
    await db.query(
      `insert into conversation_threads (
         invite_id, listing_id, user_a_id, user_b_id,
         deal_pending_at, deal_pending_by
       ) values ($1, 1, $2, $3, now(), 'wife')`,
      [invite.rows[0]!.id, a, b],
    );

    await db.query(
      `update conversation_threads
       set deal_done_at = now(), deal_done_by = 'wife'
       where id = 1`,
    );
    const thread = await db.query<{ listing_id: number }>(
      `select listing_id from conversation_threads where id = 1`,
    );
    await db.query(UNPUBLISH_LISTING_SQL, [thread.rows[0]!.listing_id]);

    const after = await db.query<{
      available: boolean;
      is_draft: boolean;
      deciding_at: string | null;
    }>(
      `select available, is_draft, deciding_at from listings where id = 1`,
    );
    assert.equal(after.rows[0]?.available, false);
    assert.equal(after.rows[0]?.is_draft, false);
    assert.equal(after.rows[0]?.deciding_at, null);

    const board = await db.query<{ n: number }>(
      `select count(*)::int as n from listings where ${BOARD_VISIBLE_SQL}`,
    );
    assert.equal(board.rows[0]?.n, 0);

    const ownPosted = await db.query<{ n: number }>(
      `select count(*)::int as n from listings
       where user_id = $1 and is_draft = false`,
      ["wife"],
    );
    assert.equal(ownPosted.rows[0]?.n, 1);

    await db.query(
      `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
       values (1, 'wife', 'husband', 5), (1, 'husband', 'wife', 4)`,
    );
    const ratings = await db.query<{ n: number }>(
      `select count(*)::int as n from connection_ratings where thread_id = 1`,
    );
    assert.equal(ratings.rows[0]?.n, 2);

    await db.close();
  });
});

describe("0016_rating_categories", () => {
  it("copies legacy stars into all three categories and averages set overalls", async () => {
    const db = new PGlite();
    await db.waitReady;
    await db.exec(sqlFile("0002_listings.sql"));
    await db.exec(sqlFile("0005_profiles.sql"));
    await db.exec(sqlFile("0012_messages_ratings.sql"));
    await db.query(
      `insert into connection_invites (from_user_id, to_user_id, status)
       values ('ann', 'ben', 'accepted')`,
    );
    const invite = await db.query<{ id: number }>(
      `select id from connection_invites limit 1`,
    );
    const [a, b] = pairUserIds("ben", "ann");
    await db.query(
      `insert into conversation_threads (invite_id, user_a_id, user_b_id)
       values ($1, $2, $3)`,
      [invite.rows[0]!.id, a, b],
    );
    await db.query(
      `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
       values (1, 'ann', 'ben', 4)`,
    );

    await db.exec(sqlFile("0016_rating_categories.sql"));

    const legacy = await db.query<{
      honesty: number;
      courtesy: number;
      reliability: number;
      stars: number;
    }>(
      `select honesty, courtesy, reliability, stars
       from connection_ratings where rated_user_id = 'ben'`,
    );
    assert.deepEqual(legacy.rows[0], {
      honesty: 4,
      courtesy: 4,
      reliability: 4,
      stars: 4,
    });

    await db.query(
      `insert into connection_ratings
         (thread_id, rater_user_id, rated_user_id, stars, honesty, courtesy, reliability)
       values (1, 'ben', 'ann', 4, 5, 4, 3)`,
    );

    const overall = await db.query<{ avg: string | number; n: number }>(
      `select avg((honesty + courtesy + reliability)::numeric / 3) as avg,
              count(*)::int as n
       from connection_ratings where rated_user_id = 'ann'`,
    );
    assert.equal(Number(overall.rows[0]!.avg), 4);
    assert.equal(overall.rows[0]!.n, 1);

    await assert.rejects(
      () =>
        db.query(
          `insert into connection_ratings
             (thread_id, rater_user_id, rated_user_id, stars, honesty, courtesy, reliability)
           values (1, 'cal', 'ann', 3, 5, 0, 3)`,
        ),
      /check|constraint|violat/i,
    );

    await db.close();
  });
});
