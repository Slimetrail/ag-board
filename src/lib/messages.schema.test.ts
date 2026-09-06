import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pairUserIds } from "./connect-helpers.ts";

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
    });
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
