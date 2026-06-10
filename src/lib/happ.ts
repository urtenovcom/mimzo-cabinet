// =============================================================
//   Happ deeplink helper.
//
//   Happ has NO `happ://add/<base64>` scheme. The one-tap "add
//   subscription" deeplink is an ENCRYPTED link of the form
//   `happ://crypt5/<blob>`, produced by Happ's crypto API. This
//   also hides the real subscription URL from anyone inspecting
//   the link.
//
//   Docs: https://www.happ.su/main/dev-docs/crypto-link.md
// =============================================================

const CRYPTO_API = "https://crypto.happ.su/api-v2.php";

// Module-level cache: sub URL → crypt5 deeplink. The sub_token is
// stable per user, so this avoids hammering the crypto API on every
// page render.
const cache = new Map<string, string>();

/**
 * Returns a `happ://crypt5/...` one-tap import deeplink for the given
 * subscription URL. Falls back to the raw URL if the crypto API is
 * unreachable (so the button still does *something* useful).
 */
export async function buildHappDeeplink(subUrl: string): Promise<string> {
  const cached = cache.get(subUrl);
  if (cached) return cached;

  try {
    const res = await fetch(CRYPTO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: subUrl }),
      // crypt5 blob is deterministic enough; cache for a day server-side
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`happ crypto ${res.status}`);
    const data = (await res.json()) as { encrypted_link?: string };
    if (!data.encrypted_link) throw new Error("no encrypted_link in response");
    cache.set(subUrl, data.encrypted_link);
    return data.encrypted_link;
  } catch (e) {
    console.error("[happ] crypto api failed, falling back to raw url:", e);
    return subUrl;
  }
}
