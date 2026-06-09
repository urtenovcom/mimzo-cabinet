// =============================================================
//  Mimzo subscription content builder
//
//  Generates the Happ-compatible base64 subscription bundle:
//    happ://routing/onadd/<b64-routing-profile>
//    vless://...#🇳🇱 Нидерланды
//    vless://...#🇫🇮 Финляндия
//
//  All wrapped in a single base64 layer (what Happ expects).
// =============================================================

const APP_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://app.mimzo.ru";

// ── VPN servers ───────────────────────────────────────────────
// These are the entry endpoints users connect to (handcrafted xray).
// One day Marzneshin will dynamically push per-user UUIDs; until
// then everyone shares the same UUID per server.
//
// Keep this in sync with C:/vpn-secrets/{ru,foreign-v2,ws-creds}.txt
// ──────────────────────────────────────────────────────────────

interface VlessServer {
  /** Display name in Happ — shown as `#fragment` */
  label: string;
  /** Builds a vless URL using the user's UUID */
  build: (uuid: string) => string;
}

const SERVERS: VlessServer[] = [
  {
    // 🇳🇱 NL chain: Yandex Cloud (RU bridge) → Hetzner NL exit
    label: "🇳🇱 Нидерланды",
    build: () =>
      "vless://8cf15718-672d-4d7d-9058-32cc38f140cf" +
      "@ss.demoalazar.ru:443" +
      "?security=reality" +
      "&encryption=none" +
      "&pbk=A2uVt2tSNJ4RqAZUzD8kNZuSPbeiqXBcHf0yVMP9AGw" +
      "&headerType=none" +
      "&fp=chrome" +
      "&type=tcp" +
      "&flow=xtls-rprx-vision" +
      "&sni=yastatic.net" +
      "&sid=8a493b9c90c078ef" +
      "#" + encodeURIComponent("🇳🇱 Нидерланды"),
  },
  {
    // 🇫🇮 FI chain: Aeza (RU bridge, WS+TLS) → serv.host FI exit
    label: "🇫🇮 Финляндия",
    build: () =>
      "vless://8ebc730e-29ae-446e-bbe0-5d7501c4504d" +
      "@test.alazarservers.org:443" +
      "?encryption=none" +
      "&security=tls" +
      "&sni=test.alazarservers.org" +
      "&type=ws" +
      "&host=test.alazarservers.org" +
      "&path=" + encodeURIComponent("/144bbe12a430") +
      "&fp=chrome" +
      "&alpn=h2,http/1.1" +
      "#" + encodeURIComponent("🇫🇮 Финляндия"),
  },
];

// ── Happ routing profile ──────────────────────────────────────
// Bypass list: WB / Сбер / Госуслуги / Yandex / VK / banks ride
// the user's real connection, everything else goes through VPN.
// ──────────────────────────────────────────────────────────────

const ROUTING_PROFILE = {
  Name: "Mimzo Routing",
  GlobalProxy: "true",
  RemoteDNSType: "DoH",
  RemoteDNSDomain: "https://cloudflare-dns.com/dns-query",
  RemoteDNSIP: "1.1.1.1",
  DomesticDNSType: "DoH",
  DomesticDNSDomain: "https://common.dot.dns.yandex.net/dns-query",
  DomesticDNSIP: "77.88.8.8",
  Geoipurl:
    "https://raw.githubusercontent.com/urtenovcom/mimzo-geo/main/dist/geoip-mimzo.dat",
  Geositeurl:
    "https://raw.githubusercontent.com/urtenovcom/mimzo-geo/main/dist/geosite-mimzo.dat",
  DnsHosts: {},
  DirectSites: [
    "domain:wildberries.ru",
    "domain:wbstatic.net",
    "domain:wb.ru",
    "domain:ozon.ru",
    "domain:ozonru.me",
    "domain:sber.ru",
    "domain:sberbank.ru",
    "domain:sberbank.com",
    "domain:online.sberbank.ru",
    "domain:gosuslugi.ru",
    "domain:esia.gosuslugi.ru",
    "domain:nalog.gov.ru",
    "domain:nalog.ru",
    "domain:avito.ru",
    "domain:yandex.ru",
    "domain:yastatic.net",
    "domain:yandex.net",
    "domain:ya.ru",
    "domain:kassa.yandex.ru",
    "domain:mc.yandex.ru",
    "domain:vk.com",
    "domain:vk.ru",
    "domain:userapi.com",
    "domain:mail.ru",
    "domain:ok.ru",
    "domain:mts.ru",
    "domain:megafon.ru",
    "domain:beeline.ru",
    "domain:tele2.ru",
    "domain:rutube.ru",
    "domain:dzen.ru",
    "domain:max.ru",
    "domain:tinkoff.ru",
    "domain:vtb.ru",
    "domain:alfabank.ru",
    "domain:kinopoisk.ru",
    "domain:ivi.ru",
    "domain:okko.tv",
    "domain:demoalazar.ru",
    "domain:alazarservers.org",
    "domain:mimzo.ru",
  ],
  DirectIp: [
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "127.0.0.0/8",
  ],
  ProxySites: [],
  ProxyIp: [],
  BlockSites: ["geosite:category-ads"],
  BlockIp: [],
  DomainStrategy: "IPIfNonMatch",
  FakeDNS: "false",
};

// ── helpers ───────────────────────────────────────────────────

function b64UrlNoPad(s: string): string {
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64Std(s: string): string {
  return Buffer.from(s, "utf8").toString("base64");
}

// ── public API ────────────────────────────────────────────────

export interface SubBuildInput {
  /** User UUID — used as the VLESS client id in each vless URL */
  uuid: string;
  /** Whether the subscription is expired or out-of-limits */
  warning?: string;
}

/**
 * Build the active subscription content (base64-encoded).
 */
export function buildActiveSubscription(input: SubBuildInput): string {
  const routingBlob = b64UrlNoPad(JSON.stringify(ROUTING_PROFILE));
  const lines: string[] = [];
  lines.push(`happ://routing/onadd/${routingBlob}`);
  for (const server of SERVERS) {
    lines.push(server.build(input.uuid));
  }
  return b64Std(lines.join("\n"));
}

/**
 * Build a 'broken' subscription that surfaces a warning to the user
 * inside Happ (server appears with a warning emoji and an unreachable
 * address — so they see WHY they have no VPN).
 */
export function buildWarningSubscription(message: string): string {
  const vless =
    "vless://00000000-0000-0000-0000-000000000000@127.0.0.1:1" +
    "?security=none" +
    "&encryption=none" +
    "&type=tcp" +
    "#" +
    encodeURIComponent(`⚠️ ${message}`);
  return b64Std(vless);
}

/**
 * Format subscription HTTP headers (Profile-Title, traffic/expire info)
 * so Happ shows the right name and progress bar.
 */
export interface SubHeadersInput {
  trafficUsedBytes: number;
  trafficTotalBytes: number;
  expiresAtUnix: number;
}

export function buildHeaders(input: SubHeadersInput): Record<string, string> {
  return {
    "Content-Type": "text/plain; charset=utf-8",
    "Profile-Title": "base64:TWltem8=",
    "Profile-Update-Interval": "12",
    "Support-Url": APP_ORIGIN,
    "Profile-Web-Page-Url": APP_ORIGIN,
    "Content-Disposition": `inline; filename="Mimzo"`,
    "Subscription-Userinfo": [
      `upload=0`,
      `download=${input.trafficUsedBytes}`,
      `total=${input.trafficTotalBytes}`,
      `expire=${input.expiresAtUnix}`,
    ].join("; "),
  };
}

// User-Agents we treat as actual VPN clients (Happ, sing-box family).
// Anything else (browsers, curl, scanners, bots) is rejected and NOT
// counted against the device limit — they get the subscription content
// but no row is inserted into public.devices.
const VPN_CLIENT_HINTS = [
  "happ",
  "v2rayng",
  "v2rayn",
  "nekobox",
  "nekoray",
  "shadowrocket",
  "streisand",
  "hiddify",
  "singbox",
  "sing-box",
  "xray",
  "matsuri",
  "fairplay",
  "foxray",
  "v2box",
  "clash",
  "leaf",
  "outline",
];

export function isVpnClientUA(ua: string | null): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return VPN_CLIENT_HINTS.some((kw) => lower.includes(kw));
}

/**
 * Hash a User-Agent into a stable 16-hex device id.
 * Falls back to first 16 chars of a default if UA is missing.
 */
export async function deviceHash(ua: string | null): Promise<string> {
  const normalized = (ua ?? "unknown").toLowerCase().trim();
  const buf = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

// Minimal iPhone model dictionary — extend over time as we see real UAs
const IPHONE_MODELS: Record<string, string> = {
  "iPhone10,1": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X",
  "iPhone10,4": "iPhone 8",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone10,6": "iPhone X",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max",
  "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE 2",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,6": "iPhone SE 3",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
};

export interface ParsedDevice {
  display_name: string | null;
  os: string | null;
  client_app: string | null;
  app_version: string | null;
}

/**
 * Best-effort device label from User-Agent + optional Happ HWID context.
 * iOS Happ:     "Happ/2.17.1 CFNetwork/x Darwin/y (iPhone14,2)"
 * macOS Happ:   "Happ/2.17.1 (Macintosh; ...)"
 * Windows Happ: "Happ/2.17.1 (Windows NT 10.0; Win64; x64)"
 * Android:      "Happ/2.17.1 (Linux; Android 14; SM-G991B)"
 */
export function parseDeviceInfo(ua: string | null): ParsedDevice {
  if (!ua)
    return {
      display_name: null,
      os: null,
      client_app: "Unknown",
      app_version: null,
    };

  const lower = ua.toLowerCase();

  // Client app
  let client_app: string | null = null;
  if (lower.includes("happ")) client_app = "Happ";
  else if (lower.includes("v2rayng")) client_app = "v2rayNG";
  else if (lower.includes("v2rayn")) client_app = "v2rayN";
  else if (lower.includes("nekobox")) client_app = "NekoBox";
  else if (lower.includes("nekoray")) client_app = "Nekoray";
  else if (lower.includes("shadowrocket")) client_app = "Shadowrocket";
  else if (lower.includes("streisand")) client_app = "Streisand";
  else if (lower.includes("hiddify")) client_app = "Hiddify";
  else if (lower.includes("singbox") || lower.includes("sing-box"))
    client_app = "sing-box";
  else client_app = "Unknown";

  // App version
  let app_version: string | null = null;
  const appVerMatch = ua.match(
    /(?:Happ|v2rayNG|v2rayN|NekoBox|Hiddify|Streisand|Shadowrocket|sing-box)\/([0-9.]+)/i,
  );
  if (appVerMatch) app_version = appVerMatch[1];

  // OS
  let os: string | null = null;
  let os_version: string | null = null;
  if (/iphone|ipad|ipod/.test(lower)) {
    os = "iOS";
    const iosVer = ua.match(/iPhone OS (\d+[._]\d+(?:[._]\d+)?)/i);
    if (iosVer) os_version = iosVer[1].replace(/_/g, ".");
  } else if (/android/.test(lower)) {
    os = "Android";
    const av = ua.match(/Android (\d+(?:\.\d+)*)/i);
    if (av) os_version = av[1];
  } else if (/macintosh|mac os x|darwin/.test(lower)) {
    os = "macOS";
    const mv = ua.match(/Mac OS X (\d+[._]\d+(?:[._]\d+)?)/i);
    if (mv) os_version = mv[1].replace(/_/g, ".");
  } else if (/windows/.test(lower)) {
    os = "Windows";
    if (/windows nt 10\.0/i.test(ua)) os_version = "10/11";
    else if (/windows nt 6\.3/i.test(ua)) os_version = "8.1";
    else if (/windows nt 6\.1/i.test(ua)) os_version = "7";
  } else if (/linux/.test(lower)) {
    os = "Linux";
  }

  // Device model
  let display_name: string | null = null;

  // iPhone model: iPhone14,7 → "iPhone 14"
  const iphoneMatch = ua.match(/iPhone\d+,\d+/);
  if (iphoneMatch) {
    display_name =
      IPHONE_MODELS[iphoneMatch[0]] ?? iphoneMatch[0].replace(",", ".");
  }

  // iPad model: iPad13,4 → "iPad"
  if (!display_name && /iPad\d+,\d+/.test(ua)) {
    display_name = "iPad";
  }

  // Android model: extract last token like "SM-G991B" or "Pixel 7"
  if (!display_name && os === "Android") {
    const m = ua.match(/Android [\d.]+;\s*([^)]+)\)/);
    if (m) display_name = m[1].split(";").pop()?.trim() ?? null;
  }

  // macOS — try to use hostname from headers (caller can override)
  // Windows — same
  if (!display_name) {
    if (os && os_version) display_name = `${os} ${os_version}`;
    else if (os) display_name = os;
  }

  return { display_name, os, client_app, app_version };
}
