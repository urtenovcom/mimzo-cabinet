import {
  Home,
  Shield,
  Gem,
  Wallet,
  Users,
  MessageSquare,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Главная", href: "/app", icon: Home },
      { label: "Моя подписка", href: "/app/vpn", icon: Shield },
      { label: "Тарифы", href: "/app/plans", icon: Gem },
      { label: "Финансы", href: "/app/billing", icon: Wallet },
    ],
  },
  {
    label: "Сообщество",
    items: [
      { label: "Рефералы", href: "/app/referrals", icon: Users },
      { label: "Поддержка", href: "/app/support", icon: MessageSquare },
    ],
  },
  {
    label: "Аккаунт",
    items: [{ label: "Настройки", href: "/app/settings", icon: Settings }],
  },
];
