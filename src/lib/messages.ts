import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  canSubmitRating,
  pairUserIds,
} from "@/lib/connect-helpers";
import { getSql, type Sql } from "@/lib/db";
import { loadPublicProfiles, type PublicProfile } from "@/lib/profiles";

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
  dealDone: boolean;
  myRating: number | null;
  theyRated: boolean;
  messages: ChatMessage[];
};

export type ThreadSummary = {
  threadId: number;
  listingId: number | null;
  other: PublicProfile;
  dealDone: boolean;
  lastBody: string | null;
  lastAt: string | null;
};

type ThreadRow = {
  id: number;
  invite_id: number | null;
  listing_id: number | null;
  user_a_id: string;
  user_b_id: string;
  deal_done_at: string | null;
  deal_done_by: string | null;
};

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
     where user_a_id = $1 and user_b_id = $2
     limit 1`,
    [userA, userB],
  );
  if (existing[0]) return existing[0].id;

  const inserted = await sql.query<{ id: number }>(
    `insert into conversation_threads (invite_id, listing_id, user_a_id, user_b_id)
     values ($1, $2, $3, $4)
     on conflict (user_a_id, user_b_id) do update set
       invite_id = coalesce(conversation_threads.invite_id, excluded.invite_id),
       listing_id = coalesce(conversation_threads.listing_id, excluded.listing_id)
     returning id`,
    [invite.id, invite.listingId, userA, userB],
  );
  return inserted[0]!.id;
}

async function requireThreadMember(
  sql: Sql,
  threadId: number,
  userId: string,
): Promise<ThreadRow> {
  const rows = await sql.query<ThreadRow>(
    `select id, invite_id, listing_id, user_a_id, user_b_id, deal_done_at, deal_done_by
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
): Promise<{ myRating: number | null; theyRated: boolean }> {
  const rows = await sql.query<{ rater_user_id: string; stars: number }>(
    `select rater_user_id, stars from connection_ratings where thread_id = $1`,
    [threadId],
  );
  const mine = rows.find((row) => row.rater_user_id === me);
  return {
    myRating: mine?.stars ?? null,
    theyRated: rows.some((row) => row.rater_user_id !== me),
  };
}

async function threadState(
  sql: Sql,
  row: ThreadRow,
  me: string,
): Promise<ThreadState> {
  const otherUserId = otherIdOnThread(row, me);
  const profiles = await loadPublicProfiles(sql, [otherUserId]);
  const other = profiles.get(otherUserId);
  if (!other) throw new Error("That neighbor is not on the board.");
  const [messages, ratings] = await Promise.all([
    loadMessages(sql, row.id),
    loadRatingState(sql, row.id, me),
  ]);
  return {
    threadId: row.id,
    listingId: row.listing_id,
    other,
    dealDone: Boolean(row.deal_done_at),
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
  if (!invite) {
    throw new Error("Connect first — Accept opens a private thread.");
  }
  const threadId = await ensureThreadForAcceptedInvite(sql, {
    id: invite.id,
    fromUserId: invite.from_user_id,
    toUserId: invite.to_user_id,
    listingId: invite.listing_id ?? listingId ?? null,
  });
  return requireThreadMember(sql, threadId, me);
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
    await sql.query(
      `insert into messages (thread_id, sender_user_id, body) values ($1, $2, $3)`,
      [data.threadId, context.userId, data.body],
    );
    return threadState(sql, row, context.userId);
  });

export const markDealDone = createServerFn({ method: "POST" })
  .validator(z.object({ threadId: z.number().int().positive() }))
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await requireThreadMember(sql, data.threadId, context.userId);
    const rows = await sql.query<ThreadRow>(
      `update conversation_threads
       set deal_done_at = coalesce(deal_done_at, now()),
           deal_done_by = coalesce(deal_done_by, $2)
       where id = $1
       returning id, invite_id, listing_id, user_a_id, user_b_id, deal_done_at, deal_done_by`,
      [data.threadId, context.userId],
    );
    return threadState(sql, rows[0]!, context.userId);
  });

export const submitRating = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.number().int().positive(),
      stars: z.number().int().min(1).max(5),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ context, data }) => {
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
      `insert into connection_ratings (thread_id, rater_user_id, rated_user_id, stars)
       values ($1, $2, $3, $4)`,
      [data.threadId, context.userId, ratedUserId, data.stars],
    );
    return threadState(sql, row, context.userId);
  });

export const listThreads = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    const rows = await sql.query<
      ThreadRow & { last_body: string | null; last_at: string | null }
    >(
      `select t.id, t.invite_id, t.listing_id, t.user_a_id, t.user_b_id,
              t.deal_done_at, t.deal_done_by,
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
      [context.userId],
    );
    const otherIds = rows.map((row) => otherIdOnThread(row, context.userId));
    const profiles = await loadPublicProfiles(sql, otherIds);
    const threads: ThreadSummary[] = [];
    for (const row of rows) {
      const other = profiles.get(otherIdOnThread(row, context.userId));
      if (!other) continue;
      threads.push({
        threadId: row.id,
        listingId: row.listing_id,
        other,
        dealDone: Boolean(row.deal_done_at),
        lastBody: row.last_body,
        lastAt: asIso(row.last_at),
      });
    }
    return { threads };
  });
