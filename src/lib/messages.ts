import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  canMarkDealDone,
  canMarkDealPending,
  canSendOnThread,
  canSubmitRating,
  hasCompleteCategoryScores,
  isActiveConnectionThread,
  legacyStarsFromCategoryScores,
  pairUserIds,
  shouldKeepThreadInInbox,
  threadDealStatus,
  type CategoryScores,
  type DealStatus,
} from "@/lib/connect-helpers";
import { getSql, type Sql } from "@/lib/db";
import { unpublishListingFromBoard } from "@/lib/listing-draft";
import { loadPublicProfiles, type PublicProfile } from "@/lib/profiles";

export const THREAD_POLL_MS = 4000;

export type ChatMessage = {
  id: number;
  senderUserId: string;
  body: string;
  createdAt: string;
};

export type ThreadState = {
  threadId: number;
  listingId: number | null;
  other: PublicProfile;
  dealStatus: DealStatus;
  dealDone: boolean;
  connectionEnded: boolean;
  isListingOwner: boolean;
  myRating: CategoryScores | null;
  theyRated: boolean;
  messages: ChatMessage[];
};

export type ThreadSummary = {
  threadId: number;
  listingId: number | null;
  other: PublicProfile;
  dealStatus: DealStatus;
  dealDone: boolean;
  connectionEnded: boolean;
  lastBody: string | null;
  lastAt: string | null;
};

type ThreadRow = {
  id: number;
  invite_id: number | null;
  listing_id: number | null;
  user_a_id: string;
  user_b_id: string;
  deal_pending_at: string | null;
  deal_pending_by: string | null;
  deal_done_at: string | null;
  deal_done_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
};

const THREAD_COLUMNS =
  "id, invite_id, listing_id, user_a_id, user_b_id, deal_pending_at, deal_pending_by, deal_done_at, deal_done_by, ended_at, ended_by";

const emptyCategoryAverages = {
  honesty: null,
  courtesy: null,
  reliability: null,
};

/** Keep a thread visible even if the other profile row is missing. */
export function placeholderProfile(userId: string): PublicProfile {
  return {
    userId,
    username: "neighbor",
    imagePath: "",
    county: "",
    bio: "",
    ratingAverage: null,
    ratingCount: 0,
    categoryAverages: { ...emptyCategoryAverages },
  };
}

type MessageRow = {
  id: number;
  sender_user_id: string;
  body: string;
  created_at: string;
};

type InviteRow = {
  id: number;
  from_user_id: string;
  to_user_id: string;
  listing_id: number | null;
  status: string;
};

function asIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    body: row.body,
    createdAt: asIso(row.created_at) ?? "",
  };
}

async function acceptedInviteBetween(
  sql: Sql,
  me: string,
  them: string,
): Promise<InviteRow | null> {
  const rows = await sql.query<InviteRow>(
    `select id, from_user_id, to_user_id, listing_id, status
     from connection_invites
     where status = 'accepted'
       and ((from_user_id = $1 and to_user_id = $2)
         or (from_user_id = $2 and to_user_id = $1))
     order by created_at desc
     limit 1`,
    [me, them],
  );
  return rows[0] ?? null;
}

export async function ensureThreadForAcceptedInvite(
  sql: Sql,
  invite: {
    id: number;
    fromUserId: string;
    toUserId: string;
    listingId: number | null;
  },
): Promise<number> {
  const [userA, userB] = pairUserIds(invite.fromUserId, invite.toUserId);
  const existing = await sql.query<{ id: number }>(
    `select id from conversation_threads
     where user_a_id = $1 and user_b_id = $2 and ended_at is null
     limit 1`,
    [userA, userB],
  );
  if (existing[0]) return existing[0].id;

  const inserted = await sql.query<{ id: number }>(
    `insert into conversation_threads (invite_id, listing_id, user_a_id, user_b_id)
     values ($1, $2, $3, $4)
     on conflict (user_a_id, user_b_id) where ended_at is null do update set
       invite_id = coalesce(conversation_threads.invite_id, excluded.invite_id),
       listing_id = coalesce(conversation_threads.listing_id, excluded.listing_id)
     returning id`,
    [invite.id, invite.listingId, userA, userB],
  );
  return inserted[0]!.id;
}

async function endedDealThreadForPair(
  sql: Sql,
  me: string,
  them: string,
  listingId?: number,
): Promise<ThreadRow | null> {
  const [userA, userB] = pairUserIds(me, them);
  const rows = await sql.query<ThreadRow>(
    listingId
      ? `select ${THREAD_COLUMNS}
         from conversation_threads
         where user_a_id = $1 and user_b_id = $2
           and ended_at is not null
           and deal_done_at is not null
           and (listing_id = $3 or listing_id is null)
         order by ended_at desc
         limit 1`
      : `select ${THREAD_COLUMNS}
         from conversation_threads
         where user_a_id = $1 and user_b_id = $2
           and ended_at is not null
           and deal_done_at is not null
         order by ended_at desc
         limit 1`,
    listingId ? [userA, userB, listingId] : [userA, userB],
  );
  return rows[0] ?? null;
}

async function endThreadConnection(
  sql: Sql,
  row: ThreadRow,
  actorUserId: string,
): Promise<ThreadRow> {
  const updated = await sql.query<ThreadRow>(
    `update conversation_threads
     set ended_at = coalesce(ended_at, now()),
         ended_by = coalesce(ended_by, $2)
     where id = $1
     returning ${THREAD_COLUMNS}`,
    [row.id, actorUserId],
  );
  await sql.query(
    `update connection_invites
     set status = 'ended'
     where status = 'accepted'
       and (
         id = $1
         or (
           (from_user_id = $2 and to_user_id = $3)
           or (from_user_id = $3 and to_user_id = $2)
         )
       )`,
    [row.invite_id, row.user_a_id, row.user_b_id],
  );
  return updated[0] ?? row;
}

async function requireThreadMember(
  sql: Sql,
  threadId: number,
  userId: string,
): Promise<ThreadRow> {
  const rows = await sql.query<ThreadRow>(
    `select ${THREAD_COLUMNS}
     from conversation_threads
     where id = $1
     limit 1`,
    [threadId],
  );
  const row = rows[0];
  if (!row || (row.user_a_id !== userId && row.user_b_id !== userId)) {
    throw new Error("That thread is not yours.");
  }
  return row;
}

function otherIdOnThread(row: ThreadRow, me: string): string {
  return row.user_a_id === me ? row.user_b_id : row.user_a_id;
}

async function resolveListingOwnerId(
  sql: Sql,
  row: ThreadRow,
): Promise<string | null> {
  if (row.listing_id) {
    const listings = await sql.query<{ user_id: string | null }>(
      `select user_id from listings where id = $1 limit 1`,
      [row.listing_id],
    );
    if (listings[0]?.user_id) return listings[0].user_id;
  }
  if (row.invite_id) {
    const invites = await sql.query<{ to_user_id: string }>(
      `select to_user_id from connection_invites where id = $1 limit 1`,
      [row.invite_id],
    );
    return invites[0]?.to_user_id ?? null;
  }
  return null;
}

async function loadMessages(sql: Sql, threadId: number): Promise<ChatMessage[]> {
  const rows = await sql.query<MessageRow>(
    `select id, sender_user_id, body, created_at
     from messages
     where thread_id = $1
     order by created_at asc, id asc`,
    [threadId],
  );
  return rows.map(mapMessage);
}

async function loadRatingState(
  sql: Sql,
  threadId: number,
  me: string,
): Promise<{ myRating: CategoryScores | null; theyRated: boolean }> {
  const rows = await sql.query<{
    rater_user_id: string;
    honesty: number;
    courtesy: number;
    reliability: number;
  }>(
    `select rater_user_id, honesty, courtesy, reliability
     from connection_ratings where thread_id = $1`,
    [threadId],
  );
  const mine = rows.find((row) => row.rater_user_id === me);
  return {
    myRating: mine
      ? {
          honesty: mine.honesty,
          courtesy: mine.courtesy,
          reliability: mine.reliability,
        }
      : null,
    theyRated: rows.some((row) => row.rater_user_id !== me),
  };
}

async function threadState(
  sql: Sql,
  row: ThreadRow,
  me: string,
): Promise<ThreadState> {
  const otherUserId = otherIdOnThread(row, me);
  const [profiles, messages, ratings, ownerId] = await Promise.all([
    loadPublicProfiles(sql, [otherUserId]),
    loadMessages(sql, row.id),
    loadRatingState(sql, row.id, me),
    resolveListingOwnerId(sql, row),
  ]);
  const other = profiles.get(otherUserId) ?? placeholderProfile(otherUserId);
  const dealStatus = threadDealStatus({
    dealPendingAt: row.deal_pending_at,
    dealDoneAt: row.deal_done_at,
  });
  return {
    threadId: row.id,
    listingId: row.listing_id,
    other,
    dealStatus,
    dealDone: dealStatus === "done",
    connectionEnded: !isActiveConnectionThread(row.ended_at),
    isListingOwner: ownerId === me,
    myRating: ratings.myRating,
    theyRated: ratings.theyRated,
    messages,
  };
}

async function openThread(
  sql: Sql,
  me: string,
  otherUserId: string,
  listingId?: number,
): Promise<ThreadRow> {
  if (me === otherUserId) {
    throw new Error("That's your own place.");
  }
  const invite = await acceptedInviteBetween(sql, me, otherUserId);
  if (invite) {
    const threadId = await ensureThreadForAcceptedInvite(sql, {
      id: invite.id,
      fromUserId: invite.from_user_id,
      toUserId: invite.to_user_id,
      listingId: invite.listing_id ?? listingId ?? null,
    });
    return requireThreadMember(sql, threadId, me);
  }
  const residual = await endedDealThreadForPair(sql, me, otherUserId, listingId);
  if (residual) return residual;
  throw new Error("Connect first — Accept opens a private thread.");
}

export const getOrOpenThread = createServerFn({ method: "POST" })
  .validator(
    z.object({
      otherUserId: z.string().min(1).max(80),
      listingId: z.number().int().positive().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await openThread(
      sql,
      context.userId,
      data.otherUserId,
      data.listingId,
    );
    return threadState(sql, row, context.userId);
  });

export const getThreadState = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await requireThreadMember(sql, data.threadId, context.userId);
    return threadState(sql, row, context.userId);
  });

export const listMessages = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireThreadMember(sql, data.threadId, context.userId);
    return loadMessages(sql, data.threadId);
  });

export const sendMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.number().int().positive(),
      body: z.string().trim().min(1).max(1000),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await requireThreadMember(sql, data.threadId, context.userId);
    const connectionEnded = !isActiveConnectionThread(row.ended_at);
    if (!canSendOnThread(connectionEnded)) {
      throw new Error(
        "This connection has ended. Mark Interested again to reconnect.",
      );
    }
    await sql.query(
      `insert into messages (thread_id, sender_user_id, body) values ($1, $2, $3)`,
      [data.threadId, context.userId, data.body],
    );
    return threadState(sql, row, context.userId);
  });

export const markDealPending = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await requireThreadMember(sql, data.threadId, context.userId);
    const ownerId = await resolveListingOwnerId(sql, row);
    const status = threadDealStatus({
      dealPendingAt: row.deal_pending_at,
      dealDoneAt: row.deal_done_at,
    });
    if (!canMarkDealPending(ownerId === context.userId, status)) {
      throw new Error(
        status === "done"
          ? "This deal is already marked done."
          : status === "pending"
            ? "Deal pending is already marked."
            : "The listing owner marks Deal pending.",
      );
    }
    const rows = await sql.query<ThreadRow>(
      `update conversation_threads
       set deal_pending_at = coalesce(deal_pending_at, now()),
           deal_pending_by = coalesce(deal_pending_by, $2)
       where id = $1
       returning ${THREAD_COLUMNS}`,
      [data.threadId, context.userId],
    );
    return threadState(sql, rows[0]!, context.userId);
  });

export const markDealDone = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    const row = await requireThreadMember(sql, data.threadId, context.userId);
    const ownerId = await resolveListingOwnerId(sql, row);
    const status = threadDealStatus({
      dealPendingAt: row.deal_pending_at,
      dealDoneAt: row.deal_done_at,
    });
    if (status === "done") {
      const ended = await endThreadConnection(sql, row, context.userId);
      if (ended.listing_id) {
        await unpublishListingFromBoard(sql, ended.listing_id);
      }
      return threadState(sql, ended, context.userId);
    }
    if (!canMarkDealDone(ownerId === context.userId, status)) {
      throw new Error(
        status === "open"
          ? "Mark Deal pending first."
          : "The listing owner marks Deal done after you meet.",
      );
    }
    const rows = await sql.query<ThreadRow>(
      `update conversation_threads
       set deal_done_at = coalesce(deal_done_at, now()),
           deal_done_by = coalesce(deal_done_by, $2)
       where id = $1
       returning ${THREAD_COLUMNS}`,
      [data.threadId, context.userId],
    );
    const done = await endThreadConnection(sql, rows[0]!, context.userId);
    if (done.listing_id) {
      await unpublishListingFromBoard(sql, done.listing_id);
    }
    return threadState(sql, done, context.userId);
  });

export const submitRating = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.number().int().positive(),
      honesty: z.number().int().min(1).max(5),
      courtesy: z.number().int().min(1).max(5),
      reliability: z.number().int().min(1).max(5),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const scores = {
      honesty: data.honesty,
      courtesy: data.courtesy,
      reliability: data.reliability,
    };
    if (!hasCompleteCategoryScores(scores)) {
      throw new Error("Rate Honesty, Courtesy, and Reliability.");
    }
    const sql = await getSql();
    const row = await requireThreadMember(sql, data.threadId, context.userId);
    if (!canSubmitRating(Boolean(row.deal_done_at), false)) {
      throw new Error("Mark the deal done before you rate.");
    }
    const existing = await sql.query<{ n: number }>(
      `select count(*)::int as n from connection_ratings
       where thread_id = $1 and rater_user_id = $2`,
      [data.threadId, context.userId],
    );
    if ((existing[0]?.n ?? 0) > 0) {
      throw new Error("You already left a rating for this deal.");
    }
    const ratedUserId = otherIdOnThread(row, context.userId);
    await sql.query(
      `insert into connection_ratings
         (thread_id, rater_user_id, rated_user_id, stars, honesty, courtesy, reliability)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.threadId,
        context.userId,
        ratedUserId,
        legacyStarsFromCategoryScores(scores),
        scores.honesty,
        scores.courtesy,
        scores.reliability,
      ],
    );
    return threadState(sql, row, context.userId);
  });

async function listThreadSummaries(
  sql: Sql,
  userId: string,
  listingId?: number,
): Promise<ThreadSummary[]> {
  const rows = await sql.query<
    ThreadRow & { last_body: string | null; last_at: string | null }
  >(
    listingId
      ? `select t.${THREAD_COLUMNS.replace(/, /g, ", t.")},
                (select m.body from messages m
                  where m.thread_id = t.id
                  order by m.created_at desc, m.id desc
                  limit 1) as last_body,
                (select m.created_at from messages m
                  where m.thread_id = t.id
                  order by m.created_at desc, m.id desc
                  limit 1) as last_at
         from conversation_threads t
         where (t.user_a_id = $1 or t.user_b_id = $1)
           and (
             t.listing_id = $2
             or t.invite_id in (
               select id from connection_invites where listing_id = $2
             )
           )
         order by coalesce(
           (select m.created_at from messages m
             where m.thread_id = t.id
             order by m.created_at desc, m.id desc
             limit 1),
           t.created_at
         ) desc`
      : `select t.${THREAD_COLUMNS.replace(/, /g, ", t.")},
                (select m.body from messages m
                  where m.thread_id = t.id
                  order by m.created_at desc, m.id desc
                  limit 1) as last_body,
                (select m.created_at from messages m
                  where m.thread_id = t.id
                  order by m.created_at desc, m.id desc
                  limit 1) as last_at
         from conversation_threads t
         where t.user_a_id = $1 or t.user_b_id = $1
         order by coalesce(
           (select m.created_at from messages m
             where m.thread_id = t.id
             order by m.created_at desc, m.id desc
             limit 1),
           t.created_at
         ) desc`,
    listingId ? [userId, listingId] : [userId],
  );
  const otherIds = rows.map((row) => otherIdOnThread(row, userId));
  const profiles = await loadPublicProfiles(sql, otherIds);
  const rated = await sql.query<{ thread_id: number }>(
    rows.length === 0
      ? `select 0 as thread_id where false`
      : `select thread_id from connection_ratings
         where rater_user_id = $1
           and thread_id in (${rows.map((_, index) => `$${index + 2}`).join(", ")})`,
    rows.length === 0 ? [] : [userId, ...rows.map((row) => row.id)],
  );
  const ratedIds = new Set(rated.map((row) => row.thread_id));
  return rows.flatMap((row) => {
    const alreadyRated = ratedIds.has(row.id);
    if (
      !shouldKeepThreadInInbox({
        endedAt: row.ended_at,
        dealDoneAt: row.deal_done_at,
        alreadyRated,
      })
    ) {
      return [];
    }
    const otherId = otherIdOnThread(row, userId);
    return [
      {
        threadId: row.id,
        listingId: row.listing_id,
        other: profiles.get(otherId) ?? placeholderProfile(otherId),
        dealStatus: threadDealStatus({
          dealPendingAt: row.deal_pending_at,
          dealDoneAt: row.deal_done_at,
        }),
        dealDone: Boolean(row.deal_done_at),
        connectionEnded: !isActiveConnectionThread(row.ended_at),
        lastBody: row.last_body,
        lastAt: asIso(row.last_at),
      },
    ];
  });
}

export const listThreads = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    return { threads: await listThreadSummaries(sql, context.userId) };
  });

export const listListingThreads = createServerFn({ method: "POST" })
  .validator(z.object({ listingId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    return {
      threads: await listThreadSummaries(sql, context.userId, data.listingId),
    };
  });
