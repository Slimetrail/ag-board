import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import { dbSource, getSql } from "@/lib/db";
import { shouldSeedListings } from "@/lib/seed-policy";
import {
  CATEGORIES,
  CATEGORY_META,
  DEAL_TYPES,
  slugify,
  type Category,
  type DealType,
} from "@/lib/catalog";
import { resolveCategoryCover } from "@/lib/category-cover";
import { SEED_LISTINGS, SEED_NOTES } from "@/lib/seed-data";
import { looksLikeContactPii } from "@/lib/connect-helpers";
import { isCountyInState, placeLabel } from "@/lib/geo";
import { BOARD_VISIBLE_SQL, draftPlace, draftSaveInput } from "@/lib/listing-draft";
import { isUserUploadPath, USER_IMAGE_PATH_MAX } from "@/lib/upload-path";

export type Listing = {
  id: number;
  slug: string;
  category: Category;
  dealType: DealType;
  title: string;
  summary: string;
  description: string;
  priceCents: number | null;
  priceLabel: string;
  quantity: string;
  location: string;
  region: string;
  farmName: string;
  farmNote: string;
  imagePath: string;
  tags: string;
  available: boolean;
  featured: boolean;
  createdAt: string;
  userId: string | null;
  decidingAt: string | null;
  isDraft: boolean;
  publishedAt: string | null;
};

export type BoardNote = {
  id: number;
  listingId: number;
  farmName: string;
  body: string;
  createdAt: string;
};

export type CategoryCount = {
  category: Category;
  count: number;
  coverImage: string;
};

type ListingRow = {
  id: number;
  slug: string;
  category: string;
  deal_type: string;
  title: string;
  summary: string;
  description: string;
  price_cents: number | null;
  price_label: string;
  quantity: string;
  location: string;
  region: string;
  farm_name: string;
  farm_note: string;
  image_path: string;
  tags: string;
  available: boolean;
  featured: boolean;
  created_at: string;
  user_id: string | null;
  deciding_at: string | null;
  is_draft?: boolean | null;
  published_at?: string | null;
};

type NoteRow = {
  id: number;
  listing_id: number;
  farm_name: string;
  body: string;
  created_at: string;
};

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    slug: row.slug,
    category: row.category as Category,
    dealType: row.deal_type as DealType,
    title: row.title,
    summary: row.summary,
    description: row.description,
    priceCents: row.price_cents,
    priceLabel: row.price_label,
    quantity: row.quantity,
    location: row.location,
    region: row.region,
    farmName: row.farm_name,
    farmNote: row.farm_note,
    imagePath: row.image_path,
    tags: row.tags,
    available: row.available,
    featured: row.featured,
    createdAt: row.created_at,
    userId: row.user_id ?? null,
    decidingAt: row.deciding_at ?? null,
    isDraft: Boolean(row.is_draft),
    publishedAt: row.published_at ?? null,
  };
}

function mapNote(row: NoteRow): BoardNote {
  return {
    id: row.id,
    listingId: row.listing_id,
    farmName: row.farm_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

type SeedGlobal = typeof globalThis & {
  __acreSeedV6__?: Promise<void>;
};

async function ensureListingColumns(sql: Awaited<ReturnType<typeof getSql>>) {
  try {
    await sql.query(
      `alter table listings add column if not exists deciding_at timestamptz`,
    );
    await sql.query(
      `alter table listings add column if not exists is_draft boolean not null default false`,
    );
    await sql.query(
      `alter table listings add column if not exists published_at timestamptz`,
    );
  } catch {
    /* older deploys should still show the board */
  }
}

async function expireStaleDeciding(sql: Awaited<ReturnType<typeof getSql>>) {
  try {
    await ensureListingColumns(sql);
    await sql.query(
      `update listings
       set available = false
       where available = true
         and is_draft = false
         and deciding_at is not null
         and deciding_at < now() - interval '14 days'`,
    );
  } catch {
    /* older deploys without the column should still show the board */
  }
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

async function requireOpenState(
  sql: Awaited<ReturnType<typeof getSql>>,
  state: string,
) {
  const open = await sql.query<{ enabled_states: string }>(
    `select enabled_states from board_settings where id = 1 limit 1`,
  );
  const enabled = (open[0]?.enabled_states ?? "SC").split(",");
  if (state !== "SC" && !enabled.includes(state)) {
    throw new Error("That state is not on the board yet.");
  }
}

async function ownedDraft(
  sql: Awaited<ReturnType<typeof getSql>>,
  draftId: number,
  userId: string,
) {
  const rows = await sql.query<ListingRow>(
    `select * from listings where id = $1 and user_id = $2 and is_draft = true limit 1`,
    [draftId, userId],
  );
  return rows[0] ?? null;
}

async function ensureSeed() {
  if (!shouldSeedListings(dbSource)) return;

  const globalRef = globalThis as SeedGlobal;
  if (!globalRef.__acreSeedV6__) {
    globalRef.__acreSeedV6__ = (async () => {
      const sql = await getSql();
      for (const item of SEED_LISTINGS) {
        await sql.query(
          `insert into listings (
            slug, category, deal_type, title, summary, description,
            price_cents, price_label, quantity, location, region,
            farm_name, farm_note, image_path, tags, available, featured, created_at
          ) values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,$16,
            now() - ($17 || ' days')::interval
          )
          on conflict (slug) do update set
            category = excluded.category,
            deal_type = excluded.deal_type,
            title = excluded.title,
            summary = excluded.summary,
            description = excluded.description,
            price_cents = excluded.price_cents,
            price_label = excluded.price_label,
            quantity = excluded.quantity,
            location = excluded.location,
            region = excluded.region,
            farm_name = excluded.farm_name,
            farm_note = excluded.farm_note,
            image_path = excluded.image_path,
            tags = excluded.tags,
            featured = excluded.featured`,
          [
            item.slug,
            item.category,
            item.dealType,
            item.title,
            item.summary,
            item.description,
            item.priceCents,
            item.priceLabel,
            item.quantity,
            item.location,
            item.region,
            item.farmName,
            item.farmNote,
            item.imagePath,
            item.tags,
            item.featured,
            String(item.daysAgo),
          ],
        );
      }
      for (const note of SEED_NOTES) {
        const found = await sql.query<{ id: number }>(
          `select id from listings where slug = $1 limit 1`,
          [note.listingSlug],
        );
        const listingId = found[0]?.id;
        if (!listingId) continue;
        const exists = await sql.query<{ n: number }>(
          `select count(*)::int as n from board_notes
           where listing_id = $1 and farm_name = $2 and body = $3`,
          [listingId, note.farmName, note.body],
        );
        if ((exists[0]?.n ?? 0) > 0) continue;
        await sql.query(
          `insert into board_notes (listing_id, farm_name, body, created_at)
           values ($1, $2, $3, now() - ($4 || ' hours')::interval)`,
          [listingId, note.farmName, note.body, String(note.hoursAgo)],
        );
      }
    })().catch((err) => {
      globalRef.__acreSeedV6__ = undefined;
      throw err;
    });
  }
  await globalRef.__acreSeedV6__;
}

const listInput = z.object({
  category: z.enum(CATEGORIES).optional(),
  categories: z.array(z.enum(CATEGORIES)).max(8).optional(),
  dealType: z.enum(DEAL_TYPES).optional(),
  county: z.string().trim().min(2).max(40).optional(),
  state: z.string().trim().length(2).optional(),
  q: z.string().max(80).optional(),
  featured: z.boolean().optional(),
  ids: z.array(z.number().int()).max(80).optional(),
});

export const listListings = createServerFn({ method: "POST" })
  .validator(listInput)
  .handler(async ({ data }) => {
    try {
    await ensureSeed();
    const sql = await getSql();
    await expireStaleDeciding(sql);
    const clauses: string[] = [BOARD_VISIBLE_SQL];
    const params: unknown[] = [];

    if (data.category) {
      params.push(data.category);
      clauses.push(`category = $${params.length}`);
    }
    if (data.categories && data.categories.length > 0) {
      const placeholders = data.categories
        .map((_, index) => `$${params.length + index + 1}`)
        .join(", ");
      params.push(...data.categories);
      clauses.push(`category in (${placeholders})`);
    }
    if (data.dealType) {
      params.push(data.dealType);
      clauses.push(`deal_type = $${params.length}`);
    }
    if (data.county) {
      const state = (data.state ?? "SC").toUpperCase();
      params.push(placeLabel(data.county, state));
      clauses.push(`region = $${params.length}`);
    }
    if (data.featured) {
      clauses.push("featured = true");
    }
    if (data.ids && data.ids.length > 0) {
      const placeholders = data.ids
        .map((_, index) => `$${params.length + index + 1}`)
        .join(", ");
      params.push(...data.ids);
      clauses.push(`id in (${placeholders})`);
    }
    const q = data.q?.trim();
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      clauses.push(
        `(title ilike $${i} or summary ilike $${i} or tags ilike $${i} or farm_name ilike $${i} or region ilike $${i})`,
      );
    }

    const rows = await sql.query<ListingRow>(
      `select * from listings where ${clauses.join(" and ")}
       order by featured desc, created_at desc`,
      params,
    );
    return rows.map(mapListing);
    } catch {
      return [];
    }
  });

export const categoryCounts = createServerFn({ method: "POST" }).handler(
  async () => {
    try {
      await ensureSeed();
      const sql = await getSql();
      await expireStaleDeciding(sql);
      const rows = await sql.query<{
        category: string;
        count: number;
        cover_images: string[] | null;
      }>(
        `select
           category,
           count(*)::int as count,
           coalesce(
             array_agg(image_path order by created_at desc)
               filter (where image_path <> '' and image_path not like '/images/%'),
             '{}'
           ) as cover_images
         from listings
         where ${BOARD_VISIBLE_SQL}
         group by category`,
      );
      const now = new Date();
      return rows.map((row): CategoryCount => {
        const category = row.category as Category;
        return {
          category,
          count: row.count,
          coverImage: resolveCategoryCover(
            CATEGORY_META[category].image,
            row.cover_images ?? [],
            now,
            category,
          ),
        };
      });
    } catch {
      return [];
    }
  },
);

export const getListing = createServerFn({ method: "POST" })
  .validator(z.object({ slug: z.string().min(1).max(80) }))
  .handler(async ({ data }) => {
    try {
    await ensureSeed();
    const sql = await getSql();
    await expireStaleDeciding(sql);
    const rows = await sql.query<ListingRow>(
      `select * from listings where slug = $1 and ${BOARD_VISIBLE_SQL} limit 1`,
      [data.slug],
    );
    const listingRow = rows[0];
    if (!listingRow) return null;
    const listing = mapListing(listingRow);
    const notes = await sql.query<NoteRow>(
      `select * from board_notes where listing_id = $1 order by created_at desc`,
      [listing.id],
    );
    const similar = await sql.query<ListingRow>(
      `select * from listings
       where ${BOARD_VISIBLE_SQL} and category = $1 and slug <> $2
       order by (region = $3) desc, created_at desc
       limit 3`,
      [listing.category, listing.slug, listing.region],
    );
    return {
      listing,
      notes: notes.map(mapNote),
      similar: similar.map(mapListing),
    };
    } catch {
      return null;
    }
  });

const createInput = z.object({
  draftId: z.number().int().positive().optional(),
  category: z.enum(CATEGORIES),
  dealType: z.enum(DEAL_TYPES),
  title: z.string().trim().min(4).max(80),
  summary: z.string().trim().min(8).max(140),
  description: z.string().trim().min(20).max(1000),
  priceLabel: z.string().trim().min(2).max(40),
  quantity: z.string().trim().min(1).max(40),
  location: z.string().trim().min(2).max(60),
  county: z.string().trim().min(2).max(40),
  state: z.string().trim().length(2).optional(),
  farmName: z.string().trim().min(2).max(40),
  farmNote: z.string().trim().min(8).max(160),
  imagePath: z.string().min(1).max(USER_IMAGE_PATH_MAX),
  tags: z.string().trim().max(80).optional(),
});

export const createListing = createServerFn({ method: "POST" })
  .validator(createInput)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await ensureSeed();
    const sql = await getSql();
    await ensureListingColumns(sql);
    await requireTerms(sql, context.userId);
    if (!isUserUploadPath(data.imagePath)) {
      throw new Error("Upload your own photo of what you're posting.");
    }
    const state = (data.state ?? "SC").toUpperCase();
    if (!isCountyInState(data.county, state)) {
      throw new Error("Pick a county in an open state.");
    }
    await requireOpenState(sql, state);
    const region = placeLabel(data.county, state);
    const tags = data.tags ?? "";
    if (data.draftId) {
      const draft = await ownedDraft(sql, data.draftId, context.userId);
      if (!draft) throw new Error("That draft is gone.");
      const updated = await sql.query<ListingRow>(
        `update listings set
           category = $1, deal_type = $2, title = $3, summary = $4,
           description = $5, price_label = $6, quantity = $7, location = $8,
           region = $9, farm_name = $10, farm_note = $11, image_path = $12,
           tags = $13, available = true, is_draft = false,
           published_at = now(), created_at = now(), deciding_at = null
         where id = $14 and user_id = $15 and is_draft = true
         returning *`,
        [
          data.category,
          data.dealType,
          data.title,
          data.summary,
          data.description,
          data.priceLabel,
          data.quantity,
          data.location,
          region,
          data.farmName,
          data.farmNote,
          data.imagePath,
          tags,
          data.draftId,
          context.userId,
        ],
      );
      if (!updated[0]) throw new Error("That draft is gone.");
      return mapListing(updated[0]);
    }
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const rows = await sql.query<ListingRow>(
      `insert into listings (
        slug, category, deal_type, title, summary, description,
        price_cents, price_label, quantity, location, region,
        farm_name, farm_note, image_path, tags, user_id,
        available, is_draft, published_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        true, false, now()
      ) returning *`,
      [
        slug,
        data.category,
        data.dealType,
        data.title,
        data.summary,
        data.description,
        null,
        data.priceLabel,
        data.quantity,
        data.location,
        region,
        data.farmName,
        data.farmNote,
        data.imagePath,
        tags,
        context.userId,
      ],
    );
    return mapListing(rows[0]!);
  });

export const saveListingDraft = createServerFn({ method: "POST" })
  .validator(draftSaveInput)
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    await ensureSeed();
    const sql = await getSql();
    await ensureListingColumns(sql);
    await requireTerms(sql, context.userId);
    const imagePath = data.imagePath.trim();
    if (imagePath && !isUserUploadPath(imagePath)) {
      throw new Error("Upload your own photo of what you're posting.");
    }
    const state = (data.state ?? "SC").toUpperCase();
    if (state !== "SC") {
      await requireOpenState(sql, state);
    }
    const profile = await sql.query<{ username: string }>(
      `select username from profiles where user_id = $1 limit 1`,
      [context.userId],
    );
    const farmName = `@${profile[0]?.username ?? "neighbor"}`;
    const { location, region } = draftPlace(data.county, state);
    const title = data.title.trim();
    const summary = data.summary.trim();
    const description = data.description.trim();
    const priceLabel = data.priceLabel.trim();
    const quantity = data.quantity.trim();
    const farmNote = data.farmNote.trim();
    const tags = data.tags.trim();
    if (data.draftId) {
      const draft = await ownedDraft(sql, data.draftId, context.userId);
      if (!draft) throw new Error("That draft is gone.");
      const updated = await sql.query<ListingRow>(
        `update listings set
           category = $1, deal_type = $2, title = $3, summary = $4,
           description = $5, price_label = $6, quantity = $7, location = $8,
           region = $9, farm_name = $10, farm_note = $11, image_path = $12,
           tags = $13, available = false, is_draft = true, published_at = null
         where id = $14 and user_id = $15 and is_draft = true
         returning *`,
        [
          data.category,
          data.dealType,
          title,
          summary,
          description,
          priceLabel,
          quantity,
          location,
          region,
          farmName,
          farmNote,
          imagePath,
          tags,
          data.draftId,
          context.userId,
        ],
      );
      if (!updated[0]) throw new Error("That draft is gone.");
      return mapListing(updated[0]);
    }
    const slug = `${slugify(title || "draft")}-${Math.random().toString(36).slice(2, 6)}`;
    const rows = await sql.query<ListingRow>(
      `insert into listings (
        slug, category, deal_type, title, summary, description,
        price_cents, price_label, quantity, location, region,
        farm_name, farm_note, image_path, tags, user_id,
        available, is_draft, published_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
        false, true, null
      ) returning *`,
      [
        slug,
        data.category,
        data.dealType,
        title,
        summary,
        description,
        null,
        priceLabel,
        quantity,
        location,
        region,
        farmName,
        farmNote,
        imagePath,
        tags,
        context.userId,
      ],
    );
    return mapListing(rows[0]!);
  });

export const listOwnDrafts = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ensureListingColumns(sql);
    const rows = await sql.query<ListingRow>(
      `select * from listings
       where user_id = $1 and is_draft = true
       order by created_at desc`,
      [context.userId],
    );
    return rows.map(mapListing);
  });

export const getOwnDraft = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureListingColumns(sql);
    const row = await ownedDraft(sql, data.id, context.userId);
    return row ? mapListing(row) : null;
  });

export const deleteOwnDraft = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    await ensureListingColumns(sql);
    const draft = await ownedDraft(sql, data.id, context.userId);
    if (!draft) throw new Error("That draft is gone.");
    await sql.query(
      `delete from listings where id = $1 and user_id = $2 and is_draft = true`,
      [data.id, context.userId],
    );
    return { ok: true as const };
  });

const noteInput = z.object({
  listingId: z.number().int().positive(),
  farmName: z.string().trim().min(2).max(40),
  body: z.string().trim().min(8).max(400),
});

export const addBoardNote = createServerFn({ method: "POST" })
  .validator(noteInput)
  .middleware([authMiddleware])
  .handler(async ({ data }) => {
    if (looksLikeContactPii(data.body)) {
      throw new Error(
        "Keep phone numbers and emails out of public notes. After you connect, use the private message thread.",
      );
    }
    const sql = await getSql();
    await ensureListingColumns(sql);
    const listing = await sql.query<{ is_draft: boolean; available: boolean }>(
      `select is_draft, available from listings where id = $1 limit 1`,
      [data.listingId],
    );
    if (!listing[0] || listing[0].is_draft || !listing[0].available) {
      throw new Error("That listing is gone.");
    }
    await sql.query(
      `insert into board_notes (listing_id, farm_name, body) values ($1, $2, $3)`,
      [data.listingId, data.farmName, data.body],
    );
    return { ok: true };
  });

export const updateListingPhoto = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.number().int().positive(),
      imagePath: z.string().min(1).max(USER_IMAGE_PATH_MAX),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    if (!isUserUploadPath(data.imagePath)) {
      throw new Error("Upload your own photo of what you're posting.");
    }
    const sql = await getSql();
    const rows = await sql.query<ListingRow>(
      `select * from listings where id = $1 limit 1`,
      [data.listingId],
    );
    const listing = rows[0];
    if (!listing) throw new Error("That listing is gone.");
    if (listing.user_id !== context.userId) {
      throw new Error("You can't change that listing.");
    }
    const updated = await sql.query<ListingRow>(
      `update listings set image_path = $1 where id = $2 returning *`,
      [data.imagePath, data.listingId],
    );
    return mapListing(updated[0]!);
  });

export const updateListingOffer = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.number().int().positive(),
      priceLabel: z.string().trim().min(2).max(40),
      quantity: z.string().trim().min(1).max(40).optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql.query<ListingRow>(
      `select * from listings where id = $1 limit 1`,
      [data.listingId],
    );
    const listing = rows[0];
    if (!listing) throw new Error("That listing is gone.");
    if (listing.user_id !== context.userId) {
      throw new Error("You can't change that listing.");
    }
    const updated = await sql.query<ListingRow>(
      `update listings
       set price_label = $1,
           quantity = coalesce($2, quantity)
       where id = $3
       returning *`,
      [data.priceLabel, data.quantity ?? null, data.listingId],
    );
    return mapListing(updated[0]!);
  });

export const updateOfficePrice = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.number().int().positive(),
      priceLabel: z.string().trim().min(2).max(40),
    }),
  )
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin");
    await requireAdmin();
    const sql = await getSql();
    const updated = await sql.query<ListingRow>(
      `update listings set price_label = $1 where id = $2 returning *`,
      [data.priceLabel, data.listingId],
    );
    if (!updated[0]) throw new Error("That listing is gone.");
    return mapListing(updated[0]);
  });

export const setListingStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.number().int().positive(),
      action: z.enum(["deciding", "open", "delete"]),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const sql = await getSql();
    const rows = await sql.query<ListingRow>(
      `select * from listings where id = $1 limit 1`,
      [data.listingId],
    );
    const listing = rows[0];
    if (!listing || listing.user_id !== context.userId) {
      throw new Error("You can't change that listing.");
    }
    if (listing.is_draft) {
      if (data.action === "delete") {
        await sql.query(
          `delete from listings where id = $1 and user_id = $2 and is_draft = true`,
          [data.listingId, context.userId],
        );
        return { ok: true, gone: true as const };
      }
      throw new Error("Publish this draft from the post form.");
    }
    if (data.action === "delete") {
      await sql.query(
        `update listings set available = false, deciding_at = null where id = $1`,
        [data.listingId],
      );
      return { ok: true, gone: true as const };
    }
    if (data.action === "deciding") {
      const updated = await sql.query<ListingRow>(
        `update listings set deciding_at = now(), available = true where id = $1 returning *`,
        [data.listingId],
      );
      return { ok: true, gone: false as const, listing: mapListing(updated[0]!) };
    }
    const updated = await sql.query<ListingRow>(
      `update listings set deciding_at = null, available = true where id = $1 returning *`,
      [data.listingId],
    );
    return { ok: true, gone: false as const, listing: mapListing(updated[0]!) };
  });
