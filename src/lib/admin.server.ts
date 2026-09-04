import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { passwordError } from "@/lib/password";

const scrypt = promisify(scryptCb);
const COOKIE = "office_session";

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function checkPassword(password: string, stored: string) {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

function setSessionCookie(token: string) {
  setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

async function openSession(sql: Awaited<ReturnType<typeof getSql>>) {
  const token = randomBytes(32).toString("hex");
  await sql.query(
    `insert into admin_sessions (token, expires_at)
     values ($1, now() + interval '30 days')`,
    [token],
  );
  setSessionCookie(token);
}

export async function readAdminSession() {
  const token = getCookie(COOKIE);
  if (!token) return false;
  const sql = await getSql();
  const rows = await sql.query<{ n: number }>(
    `select count(*)::int as n from admin_sessions
     where token = $1 and expires_at > now()`,
    [token],
  );
  return (rows[0]?.n ?? 0) > 0;
}

export async function requireAdmin() {
  const ok = await readAdminSession();
  if (!ok) throw new Error("Not found.");
}

export const ADMIN_EMAIL = "jdm14pec@gmail.com";
export const ADMIN_HANDLE = "jdm14pec";

function cleanHandle(value: string) {
  return value.trim().toLowerCase().replace(/^@/, "");
}

export function isOwnerIdentity(input: {
  email?: string | null;
  name?: string | null;
  username?: string | null;
}) {
  const email = (input.email ?? "").trim().toLowerCase();
  const name = cleanHandle(input.name ?? "");
  const username = cleanHandle(input.username ?? "");
  if (email === ADMIN_EMAIL) return true;
  if (email.startsWith(`${ADMIN_HANDLE}@`)) return true;
  if (name === ADMIN_HANDLE || name === ADMIN_EMAIL) return true;
  if (username === ADMIN_HANDLE) return true;
  return false;
}

async function bindOwner(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId?: string,
) {
  if (!userId) return;
  const rows = await sql.query<{ user_id: string | null }>(
    `select user_id from board_admin where id = 1 limit 1`,
  );
  const bound = rows[0]?.user_id;
  if (bound && bound !== userId) {
    throw new Error("This desk is only for the owner.");
  }
  if (!bound) {
    await sql.query(`update board_admin set user_id = $1 where id = 1`, [userId]);
  }
}

export async function claimFromUser(userId: string) {
  const sql = await getSql();
  const boundRows = await sql.query<{ user_id: string | null }>(
    `select user_id from board_admin where id = 1 limit 1`,
  );
  const bound = boundRows[0]?.user_id ?? null;
  if (bound === userId || (await readAdminSession())) {
    await bindOwner(sql, userId);
    await openSession(sql);
    return { ok: true as const };
  }
  const auth = await sql.query<{ name: string; email: string }>(
    `select "name", "email" from "user" where "id" = $1 limit 1`,
    [userId],
  );
  const profile = await sql.query<{ username: string }>(
    `select username from profiles where user_id = $1 limit 1`,
    [userId],
  );
  if (
    !isOwnerIdentity({
      email: auth[0]?.email,
      name: auth[0]?.name,
      username: profile[0]?.username,
    })
  ) {
    throw new Error("This desk is only for the owner.");
  }
  await bindOwner(sql, userId);
  await openSession(sql);
  return { ok: true as const };
}

export async function adminStatus() {
  try {
    const sql = await getSql();
    await sql.query(
      `alter table board_admin add column if not exists user_id text`,
    );
    await sql.query(
      `update board_admin
       set username = 'jdm14pec@gmail.com'
       where id = 1 and username = 'jdm14pec'`,
    );
    const admins = await sql.query<{ n: number }>(
      `select count(*)::int as n from board_admin`,
    );
    return {
      hasAdmin: (admins[0]?.n ?? 0) > 0,
      signedIn: await readAdminSession(),
    };
  } catch {
    return { hasAdmin: false, signedIn: false };
  }
}

export async function adminCreate(username: string, password: string) {
  const issue = passwordError(password);
  if (issue) throw new Error(issue);
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    `select count(*)::int as n from board_admin`,
  );
  if ((existing[0]?.n ?? 0) > 0) {
    throw new Error("Admin login is already set.");
  }
  const passwordHash = await hashPassword(password);
  await sql.query(
    `insert into board_admin (id, username, password_hash) values (1, $1, $2)`,
    [username, passwordHash],
  );
  await openSession(sql);
  return { ok: true as const };
}

export async function adminLogin(username: string, password: string) {
  const sql = await getSql();
  const existing = await sql.query<{ n: number }>(
    `select count(*)::int as n from board_admin`,
  );
  if ((existing[0]?.n ?? 0) === 0) {
    const allowed =
      username === "jdm14pec@gmail.com" || username === "jdm14pec";
    if (!allowed) throw new Error("That admin login is off.");
    const issue = passwordError(password);
    if (issue) throw new Error(issue);
    const passwordHash = await hashPassword(password);
    await sql.query(
      `insert into board_admin (id, username, password_hash) values (1, $1, $2)`,
      ["jdm14pec@gmail.com", passwordHash],
    );
    await openSession(sql);
    return { ok: true as const };
  }
  const rows = await sql.query<{ username: string; password_hash: string }>(
    `select username, password_hash from board_admin
     where lower(username) = $1
        or ( $1 = 'jdm14pec' and lower(username) = 'jdm14pec@gmail.com' )
     limit 1`,
    [username],
  );
  const row = rows[0];
  if (!row || !(await checkPassword(password, row.password_hash))) {
    throw new Error("That admin login is off.");
  }
  await sql.query(`delete from admin_sessions where expires_at <= now()`);
  await openSession(sql);
  return { ok: true as const };
}

export async function adminLogout() {
  const token = getCookie(COOKIE);
  const sql = await getSql();
  if (token) {
    await sql.query(`delete from admin_sessions where token = $1`, [token]);
  }
  setCookie(COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return { ok: true as const };
}
