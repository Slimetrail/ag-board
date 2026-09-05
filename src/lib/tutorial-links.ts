import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { authMiddleware } from "@/lib/auth/middleware";
import { looksLikeContactPii } from "@/lib/connect-helpers";
import { getSql } from "@/lib/db";
import {
  normalizeHttpUrl,
  TUTORIAL_URL_MAX,
  type UserTutorialLink,
} from "@/lib/tutorials";

type TutorialRow = {
  id: number;
  title: string;
  summary: string;
  url: string;
  user_id: string;
  farm_name: string;
  created_at: string;
};

function mapTutorial(row: TutorialRow): UserTutorialLink {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    url: row.url,
    farmName: row.farm_name,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

async function requireTerms(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  const terms = await sql.query<{ n: number }>(
    `select count(*)::int as n from profiles
     where user_id = $1 and terms_accepted_at is not null`,
    [userId],
  );
  if ((terms[0]?.n ?? 0) === 0) {
    throw new Error("Agree to the terms before you post.");
  }
}

const createInput = z.object({
  title: z.string().trim().min(4).max(80),
  summary: z.string().trim().min(8).max(140),
  url: z.string().trim().min(8).max(TUTORIAL_URL_MAX),
});

export const listTutorialLinks = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      const sql = await getSql();
      const rows = await sql.query<TutorialRow>(
        `select id, title, summary, url, user_id, farm_name, created_at
         from tutorial_links
         order by created_at desc`,
      );
      return rows.map(mapTutorial);
    } catch {
      return [] as UserTutorialLink[];
    }
  },
);

export const createTutorialLink = createServerFn({ method: "POST" })
  .validator(createInput)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const url = normalizeHttpUrl(data.url);
    if (!url) {
      throw new Error("Use an http or https link to the video.");
    }
    const publicText = `${data.title} ${data.summary}`;
    if (looksLikeContactPii(publicText)) {
      throw new Error(
        "Keep phone numbers and emails off the public tutorial tile.",
      );
    }
    const sql = await getSql();
    await requireTerms(sql, context.userId);
    const profile = await sql.query<{ username: string }>(
      `select username from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    const farmName = `@${profile[0]?.username ?? "neighbor"}`;
    const rows = await sql.query<TutorialRow>(
      `insert into tutorial_links (title, summary, url, user_id, farm_name)
       values ($1, $2, $3, $4, $5)
       returning id, title, summary, url, user_id, farm_name, created_at`,
      [data.title, data.summary, url, context.userId, farmName],
    );
    return mapTutorial(rows[0]!);
  });

export const deleteOwnTutorialLink = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql.query<{ id: number }>(
      `delete from tutorial_links
       where id = $1 and user_id = $2
       returning id`,
      [data.id, context.userId],
    );
    if (!rows[0]) throw new Error("That tutorial is gone.");
    return { ok: true };
  });

export const removeTutorialLink = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await getSql();
    await sql.query(`delete from tutorial_links where id = $1`, [data.id]);
    return { ok: true };
  });
