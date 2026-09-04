import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { isAllowedAvatar } from "@/lib/avatar";
import { authMiddleware } from "@/lib/auth/middleware";
import { slugify } from "@/lib/catalog";
import { getSql } from "@/lib/db";

export type PublicProfile = {
  userId: string;
  username: string;
  imagePath: string;
  county: string;
  bio: string;
};

export type PersonalProfile = {
  realName: string;
  email: string;
  phone: string;
  place: string;
};

export type OwnProfile = PublicProfile &
  PersonalProfile & {
    termsAccepted: boolean;
  };

export type ConnectionRelation =
  | "self"
  | "connected"
  | "pending-out"
  | "pending-in"
  | "none";

export type InviteRow = {
  id: number;
  fromUserId: string;
  toUserId: string;
  listingId: number | null;
  status: string;
  createdAt: string;
  other: PublicProfile;
};

type ProfileRow = {
  user_id: string;
  username: string;
  display_name: string;
  image_path: string;
  county: string;
  email: string;
  phone: string;
  place: string;
  bio: string;
  terms_accepted_at: string | null;
};

const USERNAME = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,24}$/, "Usernames are 3–24 letters, numbers, or _.");

function publicOf(row: ProfileRow): PublicProfile {
  return {
    userId: row.user_id,
    username: row.username,
    imagePath: row.image_path,
    county: row.county,
    bio: row.bio,
  };
}

function personalOf(row: ProfileRow): PersonalProfile {
  return {
    realName: row.display_name,
    email: row.email,
    phone: row.phone,
    place: row.place,
  };
}

function ownOf(row: ProfileRow): OwnProfile {
  return {
    ...publicOf(row),
    ...personalOf(row),
    termsAccepted: Boolean(row.terms_accepted_at),
  };
}

async function uniqueUsername(
  sql: Awaited<ReturnType<typeof getSql>>,
  base: string,
  exceptUserId?: string,
) {
  const suggestions = await suggestUsernames(sql, base, exceptUserId);
  return suggestions[0] ?? `${base.slice(0, 16)}_${Date.now().toString(36).slice(-4)}`;
}

async function isUsernameTaken(
  sql: Awaited<ReturnType<typeof getSql>>,
  name: string,
  exceptUserId?: string,
) {
  const rows = exceptUserId
    ? await sql.query<{ n: number }>(
        `select count(*)::int as n from profiles where username = $1 and user_id <> $2`,
        [name, exceptUserId],
      )
    : await sql.query<{ n: number }>(
        `select count(*)::int as n from profiles where username = $1`,
        [name],
      );
  return (rows[0]?.n ?? 0) > 0;
}

async function suggestUsernames(
  sql: Awaited<ReturnType<typeof getSql>>,
  base: string,
  exceptUserId?: string,
) {
  const clean = (
    base.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 18) || "farm"
  ).toLowerCase();
  const stem = clean.length < 3 ? `${clean}farm` : clean;
  const pool = [
    stem,
    `${stem}2`,
    `${stem}3`,
    `${stem}_sc`,
    `${stem}_farm`,
    `${stem.slice(0, 16)}_${Math.floor(10 + Math.random() * 89)}`,
    `${stem.slice(0, 16)}_${Math.floor(10 + Math.random() * 89)}`,
  ];
  const out: string[] = [];
  for (const name of pool) {
    if (name.length < 3 || name.length > 24) continue;
    if (out.includes(name)) continue;
    if (await isUsernameTaken(sql, name, exceptUserId)) continue;
    out.push(name);
    if (out.length >= 3) break;
  }
  while (out.length < 3) {
    const name = `${stem.slice(0, 16)}_${Math.random().toString(36).slice(2, 4)}`;
    if (!(await isUsernameTaken(sql, name, exceptUserId)) && !out.includes(name)) {
      out.push(name);
    }
  }
  return out;
}

type RelationInfo = {
  relation: ConnectionRelation;
  inviteId: number | null;
};

async function relationBetween(
  sql: Awaited<ReturnType<typeof getSql>>,
  me: string,
  them: string,
): Promise<RelationInfo> {
  if (me === them) return { relation: "self", inviteId: null };
  const rows = await sql.query<{
    id: number;
    from_user_id: string;
    to_user_id: string;
    status: string;
  }>(
    `select id, from_user_id, to_user_id, status from connection_invites
     where (from_user_id = $1 and to_user_id = $2)
        or (from_user_id = $2 and to_user_id = $1)
     order by created_at desc`,
    [me, them],
  );
  if (rows.some((row) => row.status === "accepted")) {
    return { relation: "connected", inviteId: null };
  }
  const pending = rows.find((row) => row.status === "pending");
  if (!pending) return { relation: "none", inviteId: null };
  return {
    relation: pending.from_user_id === me ? "pending-out" : "pending-in",
    inviteId: pending.id,
  };
}

async function requireTerms(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
) {
  const rows = await sql.query<{ n: number }>(
    `select count(*)::int as n from profiles
     where user_id = $1 and terms_accepted_at is not null`,
    [userId],
  );
  if ((rows[0]?.n ?? 0) === 0) {
    throw new Error("Agree to the terms before you post or send a request.");
  }
}

export const ensureOwnProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const existing = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    if (existing[0]) return ownOf(existing[0]);

    const authRows = await sql.query<{
      name: string | null;
      email: string | null;
      image: string | null;
    }>(
      `select "name", "email", "image" from "user" where "id" = $1 limit 1`,
      [context.userId],
    );
    const auth = authRows[0];
    const display = (auth?.name ?? "").trim() || "Neighbor";
    const username = await uniqueUsername(sql, slugify(display));
    const image = auth?.image && isAllowedAvatar(auth.image) ? auth.image : "";
    const inserted = await sql.query<ProfileRow>(
      `insert into profiles (user_id, username, display_name, image_path, email)
       values ($1, $2, $3, $4, $5)
       returning *`,
      [context.userId, username, display.slice(0, 40), image, auth?.email ?? ""],
    );
    return ownOf(inserted[0]!);
  });

export const getOwnProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    return rows[0] ? ownOf(rows[0]) : null;
  });

const updateInput = z.object({
  username: USERNAME,
  realName: z.string().trim().min(2).max(40),
  imagePath: z.string().max(300),
  county: z.string().trim().max(40),
  email: z.string().trim().email().max(120).or(z.literal("")),
  phone: z.string().trim().max(40),
  place: z.string().trim().max(80),
  bio: z.string().trim().max(160),
});

export const updateOwnProfile = createServerFn({ method: "POST" })
  .validator(updateInput)
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (!isAllowedAvatar(data.imagePath)) {
      throw new Error("Upload your own photo, or use initials.");
    }
    const sql = await getSql();
    const taken = await sql.query<{ n: number }>(
      `select count(*)::int as n from profiles where username = $1 and user_id <> $2`,
      [data.username, context.userId],
    );
    if ((taken[0]?.n ?? 0) > 0) {
      const suggestions = await suggestUsernames(sql, data.username, context.userId);
      throw new Error(`TAKEN:${suggestions.join(",")}`);
    }
    const rows = await sql.query<ProfileRow>(
      `insert into profiles (
         user_id, username, display_name, image_path, county, email, phone, place, bio
       ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (user_id) do update set
         username = excluded.username,
         display_name = excluded.display_name,
         image_path = excluded.image_path,
         county = excluded.county,
         email = excluded.email,
         phone = excluded.phone,
         place = excluded.place,
         bio = excluded.bio,
         updated_at = now()
       returning *`,
      [
        context.userId,
        data.username,
        data.realName,
        data.imagePath,
        data.county,
        data.email,
        data.phone,
        data.place,
        data.bio,
      ],
    );
    return ownOf(rows[0]!);
  });

export const checkUsername = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().trim().max(24) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    let parsed: string;
    try {
      parsed = USERNAME.parse(data.username);
    } catch {
      return { available: false, invalid: true, suggestions: [] as string[] };
    }
    const sql = await getSql();
    const taken = await isUsernameTaken(sql, parsed, context.userId);
    if (!taken) return { available: true, invalid: false, suggestions: [] };
    const suggestions = await suggestUsernames(sql, parsed, context.userId);
    return { available: false, invalid: false, suggestions };
  });

export const getPublicProfile = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().trim().min(3).max(24) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where username = $1 limit 1`,
      [data.username.toLowerCase()],
    );
    return rows[0] ? publicOf(rows[0]) : null;
  });

export const getPublicByUserId = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [data.userId],
    );
    return rows[0] ? publicOf(rows[0]) : null;
  });

export const getProfileView = createServerFn({ method: "POST" })
  .validator(z.object({ username: z.string().trim().min(3).max(24) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where username = $1 limit 1`,
      [data.username.toLowerCase()],
    );
    const row = rows[0];
    if (!row) return null;
    const { relation, inviteId } = await relationBetween(
      sql,
      context.userId,
      row.user_id,
    );
    const revealed = relation === "self" || relation === "connected";
    return {
      public: publicOf(row),
      personal: revealed ? personalOf(row) : null,
      relation,
      pendingInviteId: relation === "pending-in" ? inviteId : null,
    };
  });

export const getConnection = createServerFn({ method: "POST" })
  .validator(z.object({ userId: z.string().min(1).max(80) }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [data.userId],
    );
    const row = rows[0];
    if (!row) {
      return {
        public: null as PublicProfile | null,
        personal: null as PersonalProfile | null,
        relation: (context.userId === data.userId
          ? "self"
          : "none") as ConnectionRelation,
        pendingInviteId: null as number | null,
      };
    }
    const { relation, inviteId } = await relationBetween(
      sql,
      context.userId,
      row.user_id,
    );
    const revealed = relation === "self" || relation === "connected";
    return {
      public: publicOf(row),
      personal: revealed ? personalOf(row) : null,
      relation,
      pendingInviteId: relation === "pending-in" ? inviteId : null,
    };
  });

export const sendInvite = createServerFn({ method: "POST" })
  .validator(
    z.object({
      toUserId: z.string().min(1).max(80),
      listingId: z.number().int().positive().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    if (data.toUserId === context.userId) {
      throw new Error("That's your own place.");
    }
    const sql = await getSql();
    await requireTerms(sql, context.userId);
    const current = await relationBetween(sql, context.userId, data.toUserId);
    if (current.relation === "connected") return { relation: "connected" as const };
    if (current.relation === "pending-out") return { relation: "pending-out" as const };
    if (current.relation === "pending-in") {
      return {
        relation: "pending-in" as const,
        pendingInviteId: current.inviteId,
      };
    }
    await sql.query(
      `insert into connection_invites (from_user_id, to_user_id, listing_id, status)
       values ($1, $2, $3, 'pending')
       on conflict (from_user_id, to_user_id) do update set
         status = 'pending',
         listing_id = excluded.listing_id`,
      [context.userId, data.toUserId, data.listingId ?? null],
    );
    return { relation: "pending-out" as const };
  });

export const listInvites = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<{
      id: number;
      from_user_id: string;
      to_user_id: string;
      listing_id: number | null;
      status: string;
      created_at: string;
    }>(
      `select id, from_user_id, to_user_id, listing_id, status, created_at
       from connection_invites
       where (from_user_id = $1 or to_user_id = $1)
         and status in ('pending', 'accepted')
       order by created_at desc`,
      [context.userId],
    );
    const others = [
      ...new Set(
        rows.map((row) =>
          row.from_user_id === context.userId ? row.to_user_id : row.from_user_id,
        ),
      ),
    ];
    let profiles: ProfileRow[] = [];
    if (others.length > 0) {
      const placeholders = others.map((_, index) => `$${index + 1}`).join(", ");
      profiles = await sql.query<ProfileRow>(
        `select * from profiles where user_id in (${placeholders})`,
        others,
      );
    }
    const byId = new Map(profiles.map((row) => [row.user_id, publicOf(row)]));
    const incoming: InviteRow[] = [];
    const outgoing: InviteRow[] = [];
    const connected: InviteRow[] = [];
    for (const row of rows) {
      const otherId =
        row.from_user_id === context.userId ? row.to_user_id : row.from_user_id;
      const other = byId.get(otherId);
      if (!other) continue;
      const item: InviteRow = {
        id: row.id,
        fromUserId: row.from_user_id,
        toUserId: row.to_user_id,
        listingId: row.listing_id,
        status: row.status,
        createdAt: row.created_at,
        other,
      };
      if (row.status === "accepted") connected.push(item);
      else if (row.to_user_id === context.userId) incoming.push(item);
      else outgoing.push(item);
    }
    return { incoming, outgoing, connected, pendingIn: incoming.length };
  });

export const respondInvite = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.number().int().positive(),
      accept: z.boolean(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireTerms(sql, context.userId);
    const status = data.accept ? "accepted" : "declined";
    const rows = await sql.query<{ id: number }>(
      `update connection_invites
       set status = $1
       where id = $2 and to_user_id = $3 and status = 'pending'
       returning id`,
      [status, data.id, context.userId],
    );
    if (!rows[0]) throw new Error("That invite is no longer open.");
    return { ok: true, status };
  });

export const acceptTerms = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const existing = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    if (!existing[0]) {
      throw new Error("Open your profile first.");
    }
    await sql.query(
      `update profiles set terms_accepted_at = now(), updated_at = now()
       where user_id = $1`,
      [context.userId],
    );
    const rows = await sql.query<ProfileRow>(
      `select * from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    return ownOf(rows[0]!);
  });
