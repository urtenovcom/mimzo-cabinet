// Database row types matching supabase/migrations/0001_init.sql

export interface Profile {
  id: string;
  email: string | null;
  telegram_id: number | null;
  telegram_username: string | null;
  balance_rub: number;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_rub: number;
  duration_days: number;
  traffic_gb: number;
  devices_limit: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type SubscriptionStatus = "active" | "expired" | "suspended";

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  is_trial: boolean;
  status: SubscriptionStatus;
  sub_token: string;
  devices_limit: number;
  traffic_gb: number;
  traffic_used_bytes: number;
  expires_at: string;
  marzban_username: string | null;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  subscription_id: string;
  device_hash: string;
  display_name: string | null;
  os: string | null;
  client_app: string | null;
  hwid: string | null;
  ua_raw: string | null;
  app_version: string | null;
  marzban_username: string | null;
  last_online_at: string | null;
  first_seen: string;
  last_seen: string;
}

export type PaymentProvider =
  | "yookassa"
  | "manual"
  | "promo"
  | "referral"
  | "admin";
export type PaymentStatus =
  | "pending"
  | "succeeded"
  | "cancelled"
  | "failed";
export type PaymentPurpose =
  | "plan"
  | "extra_device"
  | "extra_traffic"
  | "topup"
  | "referral_payout"
  | "correction";

export interface Payment {
  id: string;
  user_id: string;
  provider: PaymentProvider;
  amount_rub: number;
  status: PaymentStatus;
  purpose: PaymentPurpose;
  external_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount_rub: number | null;
  grant_days: number | null;
  grant_traffic_gb: number | null;
  uses_total: number | null;
  uses_count: number;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  commission_percent: number;
  total_earned_rub: number;
  created_at: string;
}
