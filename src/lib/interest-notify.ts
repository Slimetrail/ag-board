import { PUBLIC_PRODUCTION_ORIGIN, toHttpsOrigin } from "./auth/trusted-origins.ts";
import type { Sql } from "./db.ts";

export type InterestEmailCopy = {
  requesterUsername: string;
  listingTitle: string;
  listingUrl: string;
  profileUrl: string;
};

export type MailSendResult = {
  sent: boolean;
  reason?: string;
};

/** Browser event after Accept/Deny so banners, badges, and threads refetch. */
export const INVITES_CHANGED = "ag-invites-changed";

/** Incoming invites that are about a listing, not a profile-only request. */
export function listingInterestInvites<T extends { listingId: number | null }>(
  incoming: T[],
): T[] {
  return incoming.filter((row) => row.listingId != null);
}

/** Site-wide banner/popup: show whenever listing interest is waiting. */
export function shouldShowSiteInterestNotice(count: number): boolean {
  return count > 0;
}

/** Headline on the owner listing banner and Your listings. */
export function interestedNeighborHeadline(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "You have an interested neighbor";
  return `You have ${count} interested neighbors`;
}

export function pendingInterestLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "1 interested";
  return `${count} interested`;
}

export function interestEmailSubject(
  requesterUsername: string,
  listingTitle: string,
): string {
  return `@${requesterUsername} marked Interested on ${listingTitle}`;
}

export function interestEmailText(copy: InterestEmailCopy): string {
  return [
    `@${copy.requesterUsername} marked Interested on your listing "${copy.listingTitle}".`,
    "",
    `Their public profile: ${copy.profileUrl}`,
    `Respond (Accept or Deny): ${copy.listingUrl}`,
    "",
    "Contact stays private until you Accept. After Accept, you talk in a private message thread.",
  ].join("\n");
}

export function countPendingByListing(
  invites: Array<{ listingId: number | null }>,
): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const invite of invites) {
    if (invite.listingId == null) continue;
    counts[invite.listingId] = (counts[invite.listingId] ?? 0) + 1;
  }
  return counts;
}

export function resolvePublicAppOrigin(
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): string {
  return (
    toHttpsOrigin(env.BETTER_AUTH_URL) ??
    toHttpsOrigin(env.APP_URL) ??
    toHttpsOrigin(env.VERCEL_PROJECT_PRODUCTION_URL) ??
    toHttpsOrigin(env.VERCEL_URL) ??
    PUBLIC_PRODUCTION_ORIGIN
  );
}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** Resend HTTP send. No-ops when API key or from-address is unset. */
export async function sendPlainEmail(input: {
  to: string;
  subject: string;
  text: string;
  fetchImpl?: typeof fetch;
}): Promise<MailSendResult> {
  const apiKey = readEnv("RESEND_API_KEY");
  const from = readEnv("RESEND_FROM_EMAIL") ?? readEnv("EMAIL_FROM");
  if (!apiKey) return { sent: false, reason: "not_configured" };
  if (!from) return { sent: false, reason: "missing_from" };

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Interest email failed (${response.status})${detail ? `: ${detail}` : ""}`,
    );
  }
  return { sent: true };
}

export async function notifyListingOwnerOfInterest(
  sql: Sql,
  input: {
    ownerUserId: string;
    requesterUserId: string;
    listingId: number;
  },
  send: typeof sendPlainEmail = sendPlainEmail,
): Promise<MailSendResult> {
  const listingRows = await sql.query<{
    title: string;
    slug: string;
    user_id: string | null;
  }>(`select title, slug, user_id from listings where id = $1 limit 1`, [
    input.listingId,
  ]);
  const listing = listingRows[0];
  if (!listing || listing.user_id !== input.ownerUserId) {
    return { sent: false, reason: "listing_mismatch" };
  }

  const accountRows = await sql.query<{ email: string | null }>(
    `select "email" from "user" where "id" = $1 limit 1`,
    [input.ownerUserId],
  );
  const accountEmail = (accountRows[0]?.email ?? "").trim();
  if (!accountEmail.includes("@")) {
    return { sent: false, reason: "no_account_email" };
  }

  const requesterRows = await sql.query<{ username: string }>(
    `select username from profiles where user_id = $1 limit 1`,
    [input.requesterUserId],
  );
  const username = requesterRows[0]?.username?.trim();
  if (!username) return { sent: false, reason: "no_requester_username" };

  const origin = resolvePublicAppOrigin();
  const listingUrl = `${origin}/listing/${listing.slug}`;
  const profileUrl = `${origin}/u/${encodeURIComponent(username)}`;

  return send({
    to: accountEmail,
    subject: interestEmailSubject(username, listing.title),
    text: interestEmailText({
      requesterUsername: username,
      listingTitle: listing.title,
      listingUrl,
      profileUrl,
    }),
  });
}
