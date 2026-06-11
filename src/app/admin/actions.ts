"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteUser as marzbanDeleteUser,
  modifyUser as marzbanModifyUser,
} from "@/lib/marzban";

const GB = 1024 ** 3;

type Result = { ok: boolean; error?: string };

// ── Promo codes ───────────────────────────────────────────────

export async function createPromo(input: {
  code: string;
  grantDevices: number | null;
  grantTrafficGb: number | null;
  grantDays: number | null;
  usesTotal: number | null;
}): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(code))
    return { ok: false, error: "Неверный формат кода" };

  const db = createAdminClient();
  const { error } = await db
    .from("promo_codes")
    .insert({
      code,
      grant_devices: input.grantDevices,
      grant_traffic_gb: input.grantTrafficGb,
      grant_days: input.grantDays,
      uses_total: input.usesTotal,
      is_active: true,
    });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function togglePromo(id: string, active: boolean): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { error } = await db
    .from("promo_codes")
    .update({ is_active: active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/promos");
  return { ok: true };
}

export async function deletePromo(id: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { error } = await db.from("promo_codes").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/promos");
  return { ok: true };
}

// ── User actions ──────────────────────────────────────────────

async function syncMarzban(subId: string) {
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("traffic_gb,expires_at,status,marzban_username")
    .eq("id", subId)
    .maybeSingle();
  if (!sub?.marzban_username) return;
  // sync every device user's limits
  const { data: devices } = await db
    .from("devices")
    .select("marzban_username")
    .eq("subscription_id", subId);
  const dataLimit = sub.traffic_gb >= 9999 ? 0 : sub.traffic_gb * GB;
  const expire = Math.floor(new Date(sub.expires_at).getTime() / 1000);
  const status = sub.status === "active" ? "active" : "disabled";
  for (const d of devices ?? []) {
    if (!d.marzban_username) continue;
    try {
      await marzbanModifyUser(d.marzban_username, {
        dataLimitBytes: dataLimit,
        expireUnix: expire,
        status,
      });
    } catch {
      /* non-fatal */
    }
  }
}

export async function grantToUser(input: {
  userId: string;
  addDays: number;
  addTrafficGb: number;
  setDevices: number | null;
}): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("*")
    .eq("user_id", input.userId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Нет подписки" };

  const base = Math.max(new Date(sub.expires_at).getTime(), Date.now());
  const newExpire = new Date(base + input.addDays * 86400_000).toISOString();
  const upd: Record<string, unknown> = {
    expires_at: newExpire,
    traffic_gb: sub.traffic_gb + input.addTrafficGb,
    status: "active",
  };
  if (input.addTrafficGb > 0 || input.addDays > 0) upd.is_trial = false;
  if (input.setDevices != null) upd.devices_limit = input.setDevices;

  const { error } = await db.from("subscriptions").update(upd).eq("id", sub.id);
  if (error) return { ok: false, error: error.message };
  await syncMarzban(sub.id);
  revalidatePath(`/admin/users/${input.userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserStatus(
  userId: string,
  status: "active" | "suspended",
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Нет подписки" };
  const { error } = await db
    .from("subscriptions")
    .update({ status })
    .eq("id", sub.id);
  if (error) return { ok: false, error: error.message };
  await syncMarzban(sub.id);
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function resetUserTraffic(userId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Нет подписки" };
  await db
    .from("subscriptions")
    .update({ traffic_used_bytes: 0 })
    .eq("id", sub.id);
  // reset on Marzban devices
  const { data: devices } = await db
    .from("devices")
    .select("marzban_username")
    .eq("subscription_id", sub.id);
  const { resetUserTraffic: rt } = await import("@/lib/marzban");
  for (const d of devices ?? []) {
    if (d.marzban_username) {
      try {
        await rt(d.marzban_username);
      } catch {
        /* non-fatal */
      }
    }
  }
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function deleteUserFull(userId: string): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  // gather marzban usernames to revoke
  const { data: subs } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId);
  const subIds = (subs ?? []).map((s) => s.id);
  if (subIds.length) {
    const { data: devices } = await db
      .from("devices")
      .select("marzban_username")
      .in("subscription_id", subIds);
    for (const d of devices ?? []) {
      if (d.marzban_username) {
        try {
          await marzbanDeleteUser(d.marzban_username);
        } catch {
          /* non-fatal */
        }
      }
    }
    await db.from("devices").delete().in("subscription_id", subIds);
  }
  await db.from("payments").delete().eq("user_id", userId);
  await db.from("subscriptions").delete().eq("user_id", userId);
  await db.from("profiles").delete().eq("id", userId);
  // auth.users
  await db.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
  return { ok: true };
}

// ── Server registry metadata ──────────────────────────────────

export async function updateServerMeta(input: {
  id: string;
  name?: string;
  hosting?: string | null;
  location?: string | null;
  paid_until?: string | null;
  cpu?: string | null;
  ram?: string | null;
  disk?: string | null;
  bandwidth?: string | null;
  notes?: string | null;
}): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const db = createAdminClient();
  const { id, ...rest } = input;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined) patch[k] = v === "" ? null : v;
  }
  const { error } = await db.from("servers").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/servers");
  return { ok: true };
}

/**
 * Rename a Marzban node (bridge) — also mirrors the name into our
 * registry row matched by IP.
 */
export async function renameNode(
  nodeId: number,
  ip: string,
  name: string,
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const token = await marzToken();
  // fetch current node, patch name
  const cur = await fetch(`${base}/api/node/${nodeId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (cur.ok) {
    const node = await cur.json();
    await fetch(`${base}/api/node/${nodeId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...node, name }),
    });
  }
  // mirror into registry
  const db = createAdminClient();
  await db.from("servers").update({ name }).eq("ip", ip);
  revalidatePath("/admin/servers");
  return { ok: true };
}

/** Rename a Marzban host (location remark). */
export async function renameHost(
  inboundTag: string,
  remark: string,
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const token = await marzToken();
  const hr = await fetch(`${base}/api/hosts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!hr.ok) return { ok: false, error: "hosts read" };
  const hosts = (await hr.json()) as Record<string, Record<string, unknown>[]>;
  if (hosts[inboundTag]) {
    hosts[inboundTag] = hosts[inboundTag].map((h) => ({ ...h, remark }));
  }
  const wr = await fetch(`${base}/api/hosts`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(hosts),
  });
  if (!wr.ok) return { ok: false, error: "hosts write" };
  await fetch(`${base}/api/core/restart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  revalidatePath("/admin/servers");
  return { ok: true };
}

async function marzToken(): Promise<string> {
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  const form = new URLSearchParams();
  form.set("username", process.env.MARZBAN_ADMIN_USERNAME ?? "admin");
  form.set("password", process.env.MARZBAN_ADMIN_PASSWORD ?? "");
  form.set("grant_type", "password");
  const r = await fetch(`${base}/api/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return ((await r.json()) as { access_token: string }).access_token;
}

// ── Server / host toggle ──────────────────────────────────────

export async function toggleHost(
  inboundTag: string,
  disabled: boolean,
): Promise<Result> {
  if (!(await requireAdmin())) return { ok: false, error: "forbidden" };
  const base = process.env.MARZBAN_API_BASE ?? "https://panel.mimzo.ru";
  // fetch token
  const form = new URLSearchParams();
  form.set("username", process.env.MARZBAN_ADMIN_USERNAME ?? "admin");
  form.set("password", process.env.MARZBAN_ADMIN_PASSWORD ?? "");
  form.set("grant_type", "password");
  const tr = await fetch(`${base}/api/admin/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  if (!tr.ok) return { ok: false, error: "marzban auth" };
  const token = ((await tr.json()) as { access_token: string }).access_token;

  // read all hosts, flip is_disabled on this tag, write back
  const hr = await fetch(`${base}/api/hosts`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!hr.ok) return { ok: false, error: "hosts read" };
  const hosts = (await hr.json()) as Record<
    string,
    Record<string, unknown>[]
  >;
  if (hosts[inboundTag]) {
    hosts[inboundTag] = hosts[inboundTag].map((h) => ({
      ...h,
      is_disabled: disabled,
    }));
  }
  const wr = await fetch(`${base}/api/hosts`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(hosts),
  });
  if (!wr.ok) return { ok: false, error: "hosts write" };
  // restart core to apply
  await fetch(`${base}/api/core/restart`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  revalidatePath("/admin/servers");
  return { ok: true };
}
