// =============================================================
//   Thin Marzban REST client (admin operations only).
//
//   Marzban panel runs at MARZBAN_API_BASE with sudo admin
//   creds in MARZBAN_ADMIN_* env vars. Token is cached in-process
//   (panel issues 24h JWTs).
// =============================================================

const BASE = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
const USERNAME = process.env.MARZBAN_ADMIN_USERNAME ?? "admin";
const PASSWORD = process.env.MARZBAN_ADMIN_PASSWORD ?? "";

interface CachedToken {
  value: string;
  /** epoch seconds */
  exp: number;
}
let tokenCache: CachedToken | null = null;

async function getAdminToken(): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - 60 > nowSec) return tokenCache.value;

  const form = new URLSearchParams();
  form.set("username", USERNAME);
  form.set("password", PASSWORD);
  form.set("grant_type", "password");

  const res = await fetch(`${BASE}/api/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) {
    throw new Error(`marzban login failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  // JWT exp is encoded; safe default — 23h
  tokenCache = { value: data.access_token, exp: nowSec + 23 * 3600 };
  return data.access_token;
}

interface MarzbanRequestInit extends Omit<RequestInit, "headers"> {
  json?: unknown;
}

async function marzbanRequest<T>(
  path: string,
  init: MarzbanRequestInit = {},
): Promise<T> {
  const token = await getAdminToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  let body: BodyInit | undefined;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers,
    body: body ?? (init.body as BodyInit | undefined),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`marzban ${init.method ?? "GET"} ${path} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Types ─────────────────────────────────────────────────────

export interface MarzbanUser {
  username: string;
  status: "active" | "disabled" | "limited" | "expired" | "on_hold";
  proxies: { vless?: { id: string; flow?: string } };
  inbounds: { vless?: string[] };
  data_limit: number | null;
  expire: number | null;
  used_traffic: number;
  lifetime_used_traffic: number;
  online_at: string | null;
  sub_updated_at: string | null;
  links: string[];
  subscription_url: string;
}

// ── Public API ────────────────────────────────────────────────

/**
 * Default inbounds attached to every Mimzo user — both servers.
 */
export const DEFAULT_INBOUNDS = [
  "VLESS-WS-FI",
  "VLESS-WS-DE",
  "VLESS-WS-NL",
  "VLESS-WS-NL2",
  "VLESS-WS-PL",
  "VLESS-WS-CH",
  "VLESS-WS-BG",
  "VLESS-WS-AUTO",
];

export async function getUser(username: string): Promise<MarzbanUser | null> {
  try {
    return await marzbanRequest<MarzbanUser>(
      `/api/user/${encodeURIComponent(username)}`,
    );
  } catch (e) {
    if (String(e).includes(" → 404")) return null;
    throw e;
  }
}

export interface CreateUserInput {
  username: string;
  dataLimitBytes?: number;
  expireUnix?: number;
}

export async function createUser(
  input: CreateUserInput,
): Promise<MarzbanUser> {
  return marzbanRequest<MarzbanUser>("/api/user", {
    method: "POST",
    json: {
      username: input.username,
      proxies: { vless: { flow: "xtls-rprx-vision" } },
      inbounds: { vless: DEFAULT_INBOUNDS },
      data_limit: input.dataLimitBytes ?? 0,
      expire: input.expireUnix ?? 0,
      status: "active",
      data_limit_reset_strategy: "no_reset",
    },
  });
}

export async function ensureUser(
  input: CreateUserInput,
): Promise<MarzbanUser> {
  const existing = await getUser(input.username);
  if (existing) return existing;
  return createUser(input);
}

export interface ModifyUserInput {
  dataLimitBytes?: number;
  expireUnix?: number;
  status?: "active" | "disabled";
  /** Replace the full inbound list (Marzban accepts only a full replacement) */
  inbounds?: string[];
}

export async function modifyUser(
  username: string,
  input: ModifyUserInput,
): Promise<MarzbanUser> {
  const body: Record<string, unknown> = {};
  if (input.dataLimitBytes !== undefined) body.data_limit = input.dataLimitBytes;
  if (input.expireUnix !== undefined) body.expire = input.expireUnix;
  if (input.status !== undefined) body.status = input.status;
  if (input.inbounds !== undefined) body.inbounds = { vless: input.inbounds };
  return marzbanRequest<MarzbanUser>(
    `/api/user/${encodeURIComponent(username)}`,
    { method: "PUT", json: body },
  );
}

export async function deleteUser(username: string): Promise<void> {
  await marzbanRequest<void>(
    `/api/user/${encodeURIComponent(username)}`,
    { method: "DELETE" },
  );
}

/**
 * Reset a user's used_traffic to zero on Marzban side.
 * Called when a billing-cycle reset hits.
 */
export async function resetUserTraffic(username: string): Promise<void> {
  try {
    await marzbanRequest<unknown>(
      `/api/user/${encodeURIComponent(username)}/reset`,
      { method: "POST" },
    );
  } catch (e) {
    if (!String(e).includes(" → 404")) throw e;
  }
}

/**
 * Returns the raw links array. Each entry is a fully-formed vless://
 * URL with the per-user UUID, ready to embed in a subscription.
 */
export async function getUserLinks(username: string): Promise<string[]> {
  const user = await getUser(username);
  return user?.links ?? [];
}

/**
 * Bulk fetch all users (for cron sync). Marzban returns paginated;
 * we iterate until empty.
 */
export async function listAllUsers(): Promise<MarzbanUser[]> {
  const out: MarzbanUser[] = [];
  let offset = 0;
  const limit = 200;
  while (true) {
    const page = await marzbanRequest<{ users: MarzbanUser[]; total: number }>(
      `/api/users?offset=${offset}&limit=${limit}`,
    );
    out.push(...page.users);
    if (page.users.length < limit) break;
    offset += limit;
  }
  return out;
}
