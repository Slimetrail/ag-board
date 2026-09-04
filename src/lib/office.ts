import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { requireAdmin } from "@/lib/admin";
import { getSql } from "@/lib/db";
import { ALL_STATE_CODES, isStateCode, type StateCode } from "@/lib/geo";

export type ImproveNote = {
  id: number;
  userId: string;
  username: string;
  body: string;
  createdAt: string;
};

export type OfficeListing = {
  id: number;
  slug: string;
  title: string;
  category: string;
  dealType: string;
  priceLabel: string;
  region: string;
  location: string;
  farmName: string;
  username: string | null;
  email: string | null;
  createdAt: string;
  isDraft: boolean;
};

export type OfficeTrade = {
  id: number;
  status: string;
  fromUsername: string;
  toUsername: string;
  listingTitle: string | null;
  createdAt: string;
};

async function stewardId(sql: Awaited<ReturnType<typeof getSql>>) {
  const rows = await sql.query<{ user_id: string }>(
    `select user_id from board_steward limit 1`,
  );
  return rows[0]?.user_id ?? null;
}

async function requireSteward(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  const id = await stewardId(sql);
  if (!id || id !== userId) {
    throw new Error("Not found.");
  }
}

export const getOfficeStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const id = await stewardId(sql);
    return {
      isSteward: id === context.userId,
      unclaimed: id === null,
    };
  });

export const claimOffice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const id = await stewardId(sql);
    if (id && id !== context.userId) {
      throw new Error("Not found.");
    }
    if (!id) {
      await sql.query(`insert into board_steward (user_id) values ($1)`, [
        context.userId,
      ]);
    }
    return { isSteward: true };
  });

export const submitImprove = createServerFn({ method: "POST" })
  .validator(z.object({ body: z.string().trim().min(12).max(1200) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const profile = await sql.query<{ username: string }>(
      `select username from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    await sql.query(
      `insert into improve_notes (user_id, username, body) values ($1, $2, $3)`,
      [context.userId, profile[0]?.username ?? "neighbor", data.body],
    );
    return { ok: true };
  });

export const listImproveNotes = createServerFn({ method: "POST" })
  .handler(async () => {
    await requireAdmin();
    const sql = await getSql();
    const rows = await sql.query<{
      id: number;
      user_id: string;
      username: string;
      body: string;
      created_at: string;
    }>(`select * from improve_notes order by created_at desc`);
    return rows.map(
      (row): ImproveNote => ({
        id: row.id,
        userId: row.user_id,
        username: row.username,
        body: row.body,
        createdAt: row.created_at,
      }),
    );
  });

export const listOfficeBoard = createServerFn({ method: "POST" })
  .handler(async () => {
    await requireAdmin();
    const sql = await getSql();
    const listings = await sql.query<{
      id: number;
      slug: string;
      title: string;
      category: string;
      deal_type: string;
      price_label: string;
      region: string;
      location: string;
      farm_name: string;
      created_at: string;
      username: string | null;
      email: string | null;
      is_draft: boolean;
    }>(
      `select l.id, l.slug, l.title, l.category, l.deal_type, l.price_label,
              l.region, l.location, l.farm_name, l.created_at,
              p.username, p.email, coalesce(l.is_draft, false) as is_draft
       from listings l
       left join profiles p on p.user_id = l.user_id
       order by l.created_at desc`,
    );
    const trades = await sql.query<{
      id: number;
      status: string;
      created_at: string;
      from_username: string | null;
      to_username: string | null;
      listing_title: string | null;
    }>(
      `select i.id, i.status, i.created_at,
              a.username as from_username,
              b.username as to_username,
              l.title as listing_title
       from connection_invites i
       left join profiles a on a.user_id = i.from_user_id
       left join profiles b on b.user_id = i.to_user_id
       left join listings l on l.id = i.listing_id
       order by i.created_at desc`,
    );
    return {
      listings: listings.map(
        (row): OfficeListing => ({
          id: row.id,
          slug: row.slug,
          title: row.title,
          category: row.category,
          dealType: row.deal_type,
          priceLabel: row.price_label,
          region: row.region,
          location: row.location,
          farmName: row.farm_name,
          username: row.username,
          email: row.email,
          createdAt: row.created_at,
          isDraft: Boolean(row.is_draft),
        }),
      ),
      trades: trades.map(
        (row): OfficeTrade => ({
          id: row.id,
          status: row.status,
          fromUsername: row.from_username ?? "unknown",
          toUsername: row.to_username ?? "unknown",
          listingTitle: row.listing_title,
          createdAt: row.created_at,
        }),
      ),
    };
  });

export const getBoardSettings = createServerFn({ method: "POST" }).handler(
  async () => {
    const sql = await getSql();
    const rows = await sql.query<{ enabled_states: string }>(
      `select enabled_states from board_settings where id = 1 limit 1`,
    );
    const raw = (rows[0]?.enabled_states ?? "SC")
      .split(",")
      .map((item) => item.trim().toUpperCase())
      .filter(isStateCode);
    const enabled = Array.from(new Set<StateCode>(["SC", ...raw]));
    return { enabledStates: enabled };
  },
);

export const setEnabledStates = createServerFn({ method: "POST" })
  .validator(z.object({ states: z.array(z.string().length(2)).min(1).max(12) }))
  .handler(async ({ data }) => {
    await requireAdmin();
    const sql = await getSql();
    const enabled = Array.from(
      new Set<StateCode>(["SC", ...data.states.filter(isStateCode)]),
    ).filter((code) => ALL_STATE_CODES.includes(code));
    await sql.query(
      `insert into board_settings (id, enabled_states) values (1, $1)
       on conflict (id) do update set enabled_states = excluded.enabled_states`,
      [enabled.join(",")],
    );
    return { enabledStates: enabled };
  });
