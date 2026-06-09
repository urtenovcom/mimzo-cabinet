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

/**
 * Extract a human-readable device label from the User-Agent.
 * Best-effort — tuned for Happ on iOS / Android / Win / Mac.
 */
export function parseDeviceInfo(ua: string | null): {
  display_name: string | null;
  os: string | null;
  client_app: string | null;
} {
  if (!ua)
    return { display_name: null, os: null, client_app: "Unknown" };

  const lower = ua.toLowerCase();
  let client_app: string | null = null;
  if (lower.includes("happ")) client_app = "Happ";
  else if (lower.includes("v2rayng")) client_app = "v2rayNG";
  else if (lower.includes("v2rayn")) client_app = "v2rayN";
  else if (lower.includes("nekobox")) client_app = "NekoBox";
  else if (lower.includes("nekoray")) client_app = "Nekoray";
  else if (lower.includes("shadowrocket")) client_app = "Shadowrocket";
  else if (lower.includes("streisand")) client_app = "Streisand";
  else if (lower.includes("hiddify")) client_app = "Hiddify";
  else client_app = "Unknown";

  let os: string | null = null;
  if (/iphone|ipad|ipod|ios/.test(lower)) os = "iOS";
  else if (/android/.test(lower)) os = "Android";
  else if (/macintosh|mac os x|darwin/.test(lower)) os = "macOS";
  else if (/windows/.test(lower)) os = "Windows";
  else if (/linux/.test(lower)) os = "Linux";

  // crude iPhone model guess
  let display_name: string | null = null;
  const iphoneMatch = ua.match(/iPhone(\d+),(\d+)/);
  if (iphoneMatch) display_name = `iPhone (${iphoneMatch[0]})`;
  else if (os) display_name = `${os} · ${client_app}`;

  return { display_name, os, client_app };
}
