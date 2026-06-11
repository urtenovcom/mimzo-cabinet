// =============================================================
//   Admin data layer — aggregations over Supabase + Marzban.
//   All functions assume the caller already passed requireAdmin().
// =============================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { listAllUsers, type MarzbanUser } from "@/lib/marzban";
import type {
  Device,
  Payment,
  Profile,
  PromoCode,
  Referral,
  Subscription,
} from "@/types/db";

const GB = 1024 ** 3;

// ── Overview ──────────────────────────────────────────────────

export interface OverviewStats {
  totalUsers: number;
  activeSubs: number;
  trialSubs: number;
  paidSubs: number;
  onlineNow: number;
  trafficTodayBytes: number;
  trafficMonthBytes: number;
  revenueMonthRub: number;
  revenueTotalRub: number;
  signups7d: { date: string; count: number }[];
  servers: { name: string; status: string; healthy: boolean }[];
}

export async function getOverview(): Promise<OverviewStats> {
  const db = createAdminClient();

  const [
    { count: totalUsers },
    { data: subs },
    { data: devices },
    { data: payments },
    { data: profiles },
  ] = await Promise.all([
    db.from("profiles").select("*", { count: "exact", head: true }),
    db.from("subscriptions").select("status,is_trial,traffic_used_bytes"),
    db.from("devices").select("last_online_at"),
    db.from("payments").select("amount_rub,status,created_at"),
    db.from("profiles").select("created_at"),
  ]);

  const subList = (subs ?? []) as Pick<
    Subscription,
    "status" | "is_trial" | "traffic_used_bytes"
  >[];
  const activeSubs = subList.filter((s) => s.status === "active").length;
  const trialSubs = subList.filter((s) => s.is_trial).length;
  const paidSubs = subList.filter((s) => !s.is_trial).length;

  const now = Date.now();
  const onlineNow = (devices ?? []).filter(
    (d) =>
      d.last_online_at &&
      now - new Date(d.last_online_at).getTime() < 90_000,
  ).length;

  // revenue
  const payList = (payments ?? []) as Pick<
    Payment,
    "amount_rub" | "status" | "created_at"
  >[];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const succeeded = payList.filter((p) => p.status === "succeeded");
  const revenueTotalRub = succeeded.reduce((s, p) => s + (p.amount_rub || 0), 0);
  const revenueMonthRub = succeeded
    .filter((p) => new Date(p.created_at) >= monthStart)
    .reduce((s, p) => s + (p.amount_rub || 0), 0);

  // traffic (sum of used — proxy; "today/month" not tracked per-period yet)
  const trafficMonthBytes = subList.reduce(
    (s, x) => s + Number(x.traffic_used_bytes || 0),
    0,
  );

  // signups last 7 days
  const days: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
  }
  for (const p of profiles ?? []) {
    const key = new Date(p.created_at).toISOString().slice(0, 10);
    const slot = days.find((x) => x.date === key);
    if (slot) slot.count++;
  }

  // servers from Marzban
  let servers: OverviewStats["servers"] = [];
  try {
    const nodes = await getNodes();
    servers = nodes.map((n) => ({
      name: n.name,
      status: n.status,
      healthy: n.status === "connected",
    }));
  } catch {
    servers = [];
  }

  return {
    totalUsers: totalUsers ?? 0,
    activeSubs,
    trialSubs,
    paidSubs,
    onlineNow,
    trafficTodayBytes: 0,
    trafficMonthBytes,
    revenueMonthRub,
    revenueTotalRub,
    signups7d: days,
    servers,
  };
}

// ── Users list ────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string | null;
  createdAt: string;
  isTrial: boolean;
  status: SubStatus;
  trafficUsedBytes: number;
  trafficGb: number;
  devicesUsed: number;
  devicesLimit: number;
  expiresAt: string | null;
  balanceRub: number;
}

type SubStatus = "active" | "expired" | "suspended" | "none";

export async function listUsers(search?: string): Promise<AdminUserRow[]> {
  const db = createAdminClient();

  let q = db
    .from("profiles")
    .select("id,email,balance_rub,created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (search && search.trim()) {
    q = q.ilike("email", `%${search.trim()}%`);
  }
  const { data: profiles } = (await q) as {
    data: Pick<Profile, "id" | "email" | "balance_rub" | "created_at">[] | null;
  };
  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);
  const [{ data: subs }, { data: devices }] = await Promise.all([
    db
      .from("subscriptions")
      .select(
        "user_id,is_trial,status,traffic_used_bytes,traffic_gb,devices_limit,expires_at,id",
      )
      .in("user_id", ids),
    db.from("devices").select("subscription_id"),
  ]);

  type SubRow = {
    user_id: string;
    is_trial: boolean;
    status: string;
    traffic_used_bytes: number;
    traffic_gb: number;
    devices_limit: number;
    expires_at: string;
    id: string;
  };
  const subByUser = new Map<string, SubRow>();
  for (const s of (subs ?? []) as SubRow[]) {
    const prev = subByUser.get(s.user_id);
    if (!prev || new Date(s.expires_at) > new Date(prev.expires_at)) {
      subByUser.set(s.user_id, s);
    }
  }
  const devCountBySub = new Map<string, number>();
  for (const d of devices ?? []) {
    devCountBySub.set(
      d.subscription_id,
      (devCountBySub.get(d.subscription_id) ?? 0) + 1,
    );
  }

  return profiles.map((p) => {
    const s = subByUser.get(p.id);
    return {
      id: p.id,
      email: p.email,
      createdAt: p.created_at,
      isTrial: s?.is_trial ?? false,
      status: (s?.status as SubStatus) ?? "none",
      trafficUsedBytes: Number(s?.traffic_used_bytes ?? 0),
      trafficGb: s?.traffic_gb ?? 0,
      devicesUsed: s ? devCountBySub.get(s.id) ?? 0 : 0,
      devicesLimit: s?.devices_limit ?? 0,
      expiresAt: s?.expires_at ?? null,
      balanceRub: p.balance_rub ?? 0,
    };
  });
}

// ── User detail ───────────────────────────────────────────────

export interface AdminUserDetail {
  profile: Profile;
  subscription: Subscription | null;
  devices: Device[];
  payments: Payment[];
  referredBy: { id: string; email: string | null } | null;
  referrals: { id: string; email: string | null; createdAt: string }[];
  referralEarnedRub: number;
  marzbanTrafficBytes: number;
}

export async function getUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const db = createAdminClient();

  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()) as { data: Profile | null };
  if (!profile) return null;

  const [{ data: sub }, { data: payments }] = await Promise.all([
    db
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const subscription = sub as Subscription | null;

  let devices: Device[] = [];
  if (subscription) {
    const { data } = await db
      .from("devices")
      .select("*")
      .eq("subscription_id", subscription.id)
      .order("last_seen", { ascending: false });
    devices = (data ?? []) as Device[];
  }

  // referred by
  let referredBy: AdminUserDetail["referredBy"] = null;
  if (profile.referred_by) {
    const { data } = await db
      .from("profiles")
      .select("id,email")
      .eq("id", profile.referred_by)
      .maybeSingle();
    if (data) referredBy = { id: data.id, email: data.email };
  }

  // referrals (people this user invited)
  const { data: refRows } = await db
    .from("profiles")
    .select("id,email,created_at")
    .eq("referred_by", userId)
    .order("created_at", { ascending: false });
  const referrals = (refRows ?? []).map((r) => ({
    id: r.id,
    email: r.email,
    createdAt: r.created_at,
  }));

  // total commission earned from invited users
  const { data: earnRows } = await db
    .from("referrals")
    .select("total_earned_rub")
    .eq("referrer_id", userId);
  const referralEarnedRub = (earnRows ?? []).reduce(
    (s, r) => s + Number(r.total_earned_rub || 0),
    0,
  );

  return {
    profile,
    subscription,
    devices,
    payments: (payments ?? []) as Payment[],
    referredBy,
    referrals,
    referralEarnedRub,
    marzbanTrafficBytes: Number(subscription?.traffic_used_bytes ?? 0),
  };
}

// ── Promo codes ───────────────────────────────────────────────

export async function listPromos(): Promise<
  (PromoCode & { grant_devices: number | null })[]
> {
  const db = createAdminClient();
  const { data } = await db
    .from("promo_codes")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as (PromoCode & { grant_devices: number | null })[];
}

// ── Finance ───────────────────────────────────────────────────

export interface FinanceData {
  payments: (Payment & { email: string | null })[];
  revenueByDay: { date: string; rub: number }[];
  totalRub: number;
  promoCount: number;
  paidCount: number;
}

export async function getFinance(): Promise<FinanceData> {
  const db = createAdminClient();
  const { data: pays } = (await db
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300)) as { data: Payment[] | null };

  const list = pays ?? [];
  const userIds = [...new Set(list.map((p) => p.user_id))];
  const { data: profs } = await db
    .from("profiles")
    .select("id,email")
    .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
  const emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));

  const payments = list.map((p) => ({
    ...p,
    email: emailById.get(p.user_id) ?? null,
  }));

  // revenue by day, last 30
  const days: { date: string; rub: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), rub: 0 });
  }
  let totalRub = 0;
  let promoCount = 0;
  let paidCount = 0;
  for (const p of list) {
    if (p.status !== "succeeded") continue;
    if (p.provider === "promo") promoCount++;
    else if (p.amount_rub > 0) paidCount++;
    totalRub += p.amount_rub || 0;
    const key = new Date(p.created_at).toISOString().slice(0, 10);
    const slot = days.find((x) => x.date === key);
    if (slot) slot.rub += p.amount_rub || 0;
  }

  return { payments, revenueByDay: days, totalRub, promoCount, paidCount };
}

// ── Referrals ─────────────────────────────────────────────────

export interface ReferralRow {
  referrerId: string;
  referrerEmail: string | null;
  invitedCount: number;
  totalEarnedRub: number;
}

export async function getReferralStats(): Promise<ReferralRow[]> {
  const db = createAdminClient();
  const { data: refs } = (await db
    .from("referrals")
    .select("referrer_id,total_earned_rub")) as {
    data: Pick<Referral, "referrer_id" | "total_earned_rub">[] | null;
  };
  const agg = new Map<string, { count: number; earned: number }>();
  for (const r of refs ?? []) {
    const cur = agg.get(r.referrer_id) ?? { count: 0, earned: 0 };
    cur.count++;
    cur.earned += r.total_earned_rub || 0;
    agg.set(r.referrer_id, cur);
  }
  const ids = [...agg.keys()];
  if (ids.length === 0) return [];
  const { data: profs } = await db
    .from("profiles")
    .select("id,email")
    .in("id", ids);
  const emailById = new Map((profs ?? []).map((p) => [p.id, p.email]));
  return ids
    .map((id) => ({
      referrerId: id,
      referrerEmail: emailById.get(id) ?? null,
      invitedCount: agg.get(id)!.count,
      totalEarnedRub: agg.get(id)!.earned,
    }))
    .sort((a, b) => b.invitedCount - a.invitedCount);
}

// ── Marzban nodes + hosts ─────────────────────────────────────

export interface MarzNode {
  id: number;
  name: string;
  address: string;
  status: string;
  xray_version: string | null;
}

export async function getNodes(): Promise<MarzNode[]> {
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const token = await marzbanToken();
  const res = await fetch(`${base}/api/nodes`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nodes ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items ?? [];
  return items as MarzNode[];
}

/** Real per-node traffic (uplink+downlink bytes) keyed by node id. */
export async function getNodeUsage(): Promise<Map<number, number>> {
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const token = await marzbanToken();
  const map = new Map<number, number>();
  try {
    const res = await fetch(`${base}/api/nodes/usage`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return map;
    const data = (await res.json()) as {
      usages: { node_id: number | null; uplink: number; downlink: number }[];
    };
    for (const u of data.usages ?? []) {
      if (u.node_id == null) continue;
      map.set(u.node_id, Number(u.uplink || 0) + Number(u.downlink || 0));
    }
  } catch {
    /* usage is best-effort */
  }
  return map;
}

export interface MarzHost {
  inboundTag: string;
  remark: string;
  address: string;
  is_disabled: boolean;
}

export async function getHosts(): Promise<MarzHost[]> {
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const token = await marzbanToken();
  const res = await fetch(`${base}/api/hosts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`hosts ${res.status}`);
  const data = (await res.json()) as Record<
    string,
    { remark: string; address: string; is_disabled?: boolean }[]
  >;
  const out: MarzHost[] = [];
  for (const [tag, hosts] of Object.entries(data)) {
    for (const h of hosts) {
      out.push({
        inboundTag: tag,
        remark: h.remark,
        address: h.address,
        is_disabled: !!h.is_disabled,
      });
    }
  }
  return out;
}

// ── Server registry ───────────────────────────────────────────

export interface ServerMeta {
  id: string;
  name: string;
  ip: string;
  role: string;
  hosting: string | null;
  location: string | null;
  inbound_tag: string | null;
  paid_until: string | null;
  cpu: string | null;
  ram: string | null;
  disk: string | null;
  bandwidth: string | null;
  traffic_limit_gb: number | null;
  notes: string | null;
  is_active: boolean;
}

export async function getServerRegistry(): Promise<ServerMeta[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("servers")
    .select("*")
    .order("role")
    .order("name");
  return (data ?? []) as ServerMeta[];
}

let _tok: { v: string; exp: number } | null = null;
async function marzbanToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (_tok && _tok.exp - 60 > now) return _tok.v;
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const form = new URLSearchParams();
  form.set("username", process.env.MARZBAN_ADMIN_USERNAME ?? "admin");
  form.set("password", process.env.MARZBAN_ADMIN_PASSWORD ?? "");
  form.set("grant_type", "password");
  const res = await fetch(`${base}/api/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`marzban token ${res.status}`);
  const d = (await res.json()) as { access_token: string };
  _tok = { v: d.access_token, exp: now + 23 * 3600 };
  return d.access_token;
}

export const fmtGb = (bytes: number) =>
  `${(bytes / GB).toFixed(1)} ГБ`;
