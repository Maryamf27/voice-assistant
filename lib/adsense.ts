/**
 * Google AdSense configuration.
 *
 * Everything here is a PUBLIC identifier (AdSense publisher/ad-unit IDs are visible in the page
 * source of every site that uses AdSense). No secrets live in this file.
 *
 * NEXT_PUBLIC_* variables are inlined by Next.js at build time, and only when referenced as a
 * literal `process.env.NAME` - do not refactor these into dynamic lookups. After changing them in
 * Vercel you must redeploy for the new values to take effect.
 */

const rawClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const rawSlotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID?.trim();

/** Publisher ID, e.g. "ca-pub-" followed by digits. Taken from AdSense > Account > Account information. */
export const ADSENSE_CLIENT_ID: string | null =
  rawClientId && /^ca-pub-\d+$/.test(rawClientId) ? rawClientId : null;

/** Ad unit (slot) ID: the numeric `data-ad-slot` of a responsive display ad unit created in AdSense. */
export const ADSENSE_SLOT_ID: string | null =
  rawSlotId && /^\d+$/.test(rawSlotId) ? rawSlotId : null;

if (process.env.NODE_ENV !== "production") {
  if (rawClientId && !ADSENSE_CLIENT_ID) {
    console.warn('[adsense] NEXT_PUBLIC_ADSENSE_CLIENT_ID must look like "ca-pub-<digits>". Ads are disabled.');
  }
  if (rawSlotId && !ADSENSE_SLOT_ID) {
    console.warn("[adsense] NEXT_PUBLIC_ADSENSE_SLOT_ID must be numeric. Ads are disabled.");
  }
}

/** Ads can only run when both IDs are present and valid. With neither set, the app behaves as ad-free. */
export const ADSENSE_CONFIGURED = ADSENSE_CLIENT_ID !== null && ADSENSE_SLOT_ID !== null;

export const ADSENSE_SCRIPT_SRC: string | null = ADSENSE_CLIENT_ID
  ? `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`
  : null;

/**
 * One-time eligibility delay. A Free user's ad placements (and the AdSense script) only become
 * eligible after this long in the dashboard. It is NOT a refresh interval: it fires once per
 * dashboard session and nothing re-requests or re-renders ads afterwards. Google decides whether
 * an ad is actually served.
 */
export const ADSENSE_ELIGIBILITY_DELAY_MS = 20_000;

/**
 * The single line Google expects in /ads.txt, derived from the publisher ID ("ca-" is dropped).
 * Format: https://support.google.com/adsense/answer/12171612
 */
export function getAdsTxtLine(): string | null {
  if (!ADSENSE_CLIENT_ID) return null;
  return `google.com, ${ADSENSE_CLIENT_ID.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0`;
}
