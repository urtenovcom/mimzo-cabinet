import {
  Home,
  ShieldCheck,
  Wallet,
  Users,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  /** Match exact (e.g. dashboard root) vs prefix (e.g. /app/vpn covers nested) */
  match?: "prefix" | "exact";
}

export const PRIMARY_NAV: NavItem[] = [
  { href: "/app", label: "Главная", Icon: Home, match: "exact" },
  { href: "/app/vpn", label: "Подписка", Icon: ShieldCheck, match: "prefix" },
  { href: "/app/billing", label: "Финансы", Icon: Wallet, match: "prefix" },
  { href: "/app/referrals", label: "Рефералы", Icon: Users, match: "prefix" },
  { href: "/app/support", label: "Поддержка", Icon: LifeBuoy, match: "prefix" },
];

export function isActive(current: string, item: NavItem): boolean {
  if (item.match === "exact") return current === item.href;
  return current === item.href || current.startsWith(item.href + "/");
}
