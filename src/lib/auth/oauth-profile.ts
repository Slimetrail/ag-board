/**
 * Normalize the Grok auth broker's userinfo / id_token profile so Better Auth
 * 1.6 generic OAuth does not abort the callback with a raw error code
 * (`name_is_missing`, `email_is_missing`, `id_is_missing`).
 *
 * Google usually sends name + email. X / the broker may omit `name`, use
 * `preferred_username`, or issue a synthetic email. Those are still valid
 * first-party identities — see `account.accountLinking` in `server.ts`.
 */

export type BrokerProfile = Record<string, unknown>;

export type MappedBrokerUser = {
  id?: string;
  email?: string;
  name: string;
  emailVerified: boolean;
};

const SYNTHETIC_EMAIL_HOST = "oauth.ag-board.invalid";

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function asEmail(value: string | undefined): string | undefined {
  if (!value || !value.includes("@") || value.startsWith("@") || value.endsWith("@")) {
    return undefined;
  }
  return value.toLowerCase();
}

function accountSlug(id: string): string {
  const slug = id.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64);
  return slug || "user";
}

/** Map a broker / upstream profile onto Better Auth's required user fields. */
export function mapBrokerProfileToUser(profile: BrokerProfile): MappedBrokerUser {
  const id = firstString(profile.id, profile.sub, profile.accountId, profile.user_id);
  const email = asEmail(firstString(profile.email));
  const localPart = firstString(
    profile.preferred_username,
    profile.username,
    profile.display_name,
    profile.given_name,
    email?.split("@")[0],
    id,
  );
  const name =
    firstString(
      profile.name,
      profile.preferred_username,
      profile.username,
      profile.display_name,
      profile.given_name,
      email?.split("@")[0],
      localPart,
    ) ?? "Neighbor";

  return {
    ...(id ? { id } : {}),
    email: email ?? (id ? `${accountSlug(id)}@${SYNTHETIC_EMAIL_HOST}` : undefined),
    name,
    emailVerified: Boolean(profile.email_verified ?? profile.emailVerified),
  };
}
