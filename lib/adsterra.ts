/**
 * Adsterra ad configuration.
 *
 * Adsterra gives you a ready-made HTML snippet per ad unit from the "Websites > Manage ad units"
 * screen in your Adsterra dashboard. Unlike AdSense, there is no single global script: every ad
 * unit (Banner, Native Banner, ...) has its own `key` and its own `invoke.js` URL (the domain in
 * that URL is specific to your account and rotates over time, so we don't hard-code it here).
 *
 * Everything below is a PUBLIC identifier (ad keys are visible in the page source of every site
 * that runs them). No secrets live in this file.
 *
 * NEXT_PUBLIC_* variables are inlined by Next.js at build time, and only when referenced as a
 * literal `process.env.NAME` - do not refactor these into dynamic lookups. After changing them in
 * Vercel you must redeploy for the new values to take effect.
 *
 * --- Banner ad unit ---
 * From Adsterra's "Banner" snippet:
 *   <script>
 *     atOptions = { 'key': '...', 'format': 'iframe', 'height': 250, 'width': 300, 'params': {} };
 *   </script>
 *   <script src="//www.SOME-DOMAIN.com/<key>/invoke.js"></script>
 *
 * Set:
 *   NEXT_PUBLIC_ADSTERRA_BANNER_KEY        the 'key' value above
 *   NEXT_PUBLIC_ADSTERRA_BANNER_SCRIPT_SRC the full https:// src of the second <script> tag
 *   NEXT_PUBLIC_ADSTERRA_BANNER_WIDTH      optional, defaults to 300
 *   NEXT_PUBLIC_ADSTERRA_BANNER_HEIGHT     optional, defaults to 250
 *
 * --- Native Banner ad unit ---
 * From Adsterra's "Native Banner" snippet:
 *   <script async="async" data-cfasync="false" src="//www.SOME-DOMAIN.com/<key>/invoke.js"></script>
 *   <div id="container-<key>"></div>
 *
 * Set:
 *   NEXT_PUBLIC_ADSTERRA_NATIVE_SCRIPT_SRC    the full https:// src of the <script> tag
 *   NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID  the id of the <div>, e.g. "container-abcd123..."
 *   NEXT_PUBLIC_ADSTERRA_NATIVE_HEIGHT        optional, defaults to 300 (native ads size to content,
 *                                              this only sets the sandbox iframe's height)
 */

function normalizeSrc(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  // Accept both protocol-relative ("//host/...") and absolute https URLs; always upgrade to https.
  if (/^https:\/\/[^\s"'<>]+$/.test(trimmed)) return trimmed;
  if (/^\/\/[^\s"'<>]+$/.test(trimmed)) return `https:${trimmed}`;
  return null;
}

const rawBannerKey = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_KEY?.trim();
const rawBannerScriptSrc = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_SCRIPT_SRC;
const rawBannerWidth = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_WIDTH?.trim();
const rawBannerHeight = process.env.NEXT_PUBLIC_ADSTERRA_BANNER_HEIGHT?.trim();

/** The 'key' from the atOptions object of the Banner snippet. */
export const ADSTERRA_BANNER_KEY: string | null =
  rawBannerKey && /^[a-z0-9]{10,40}$/i.test(rawBannerKey) ? rawBannerKey : null;

/** The invoke.js URL from the Banner snippet. */
export const ADSTERRA_BANNER_SCRIPT_SRC: string | null = normalizeSrc(rawBannerScriptSrc);

export const ADSTERRA_BANNER_WIDTH: number = Number(rawBannerWidth) > 0 ? Number(rawBannerWidth) : 300;
export const ADSTERRA_BANNER_HEIGHT: number = Number(rawBannerHeight) > 0 ? Number(rawBannerHeight) : 250;

export const ADSTERRA_BANNER_CONFIGURED =
  ADSTERRA_BANNER_KEY !== null && ADSTERRA_BANNER_SCRIPT_SRC !== null;

const rawNativeScriptSrc = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_SCRIPT_SRC;
const rawNativeContainerId = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID?.trim();
const rawNativeHeight = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_HEIGHT?.trim();

/** The invoke.js URL from the Native Banner snippet. */
export const ADSTERRA_NATIVE_SCRIPT_SRC: string | null = normalizeSrc(rawNativeScriptSrc);

/** The id of the placeholder <div> from the Native Banner snippet. */
export const ADSTERRA_NATIVE_CONTAINER_ID: string | null =
  rawNativeContainerId && /^[a-z0-9_-]{5,80}$/i.test(rawNativeContainerId) ? rawNativeContainerId : null;

export const ADSTERRA_NATIVE_HEIGHT: number = Number(rawNativeHeight) > 0 ? Number(rawNativeHeight) : 300;

export const ADSTERRA_NATIVE_CONFIGURED =
  ADSTERRA_NATIVE_SCRIPT_SRC !== null && ADSTERRA_NATIVE_CONTAINER_ID !== null;

/** Ads run as soon as at least one ad unit is configured. With neither set, the app is ad-free. */
export const ADSTERRA_CONFIGURED = ADSTERRA_BANNER_CONFIGURED || ADSTERRA_NATIVE_CONFIGURED;

if (process.env.NODE_ENV !== "production") {
  if (rawBannerKey && !ADSTERRA_BANNER_KEY) {
    console.warn("[adsterra] NEXT_PUBLIC_ADSTERRA_BANNER_KEY doesn't look like a valid Adsterra key. Banner ads are disabled.");
  }
  if (rawBannerScriptSrc && !ADSTERRA_BANNER_SCRIPT_SRC) {
    console.warn("[adsterra] NEXT_PUBLIC_ADSTERRA_BANNER_SCRIPT_SRC must be a valid https:// (or //) URL. Banner ads are disabled.");
  }
  if (rawNativeScriptSrc && !ADSTERRA_NATIVE_SCRIPT_SRC) {
    console.warn("[adsterra] NEXT_PUBLIC_ADSTERRA_NATIVE_SCRIPT_SRC must be a valid https:// (or //) URL. Native ads are disabled.");
  }
  if (rawNativeContainerId && !ADSTERRA_NATIVE_CONTAINER_ID) {
    console.warn("[adsterra] NEXT_PUBLIC_ADSTERRA_NATIVE_CONTAINER_ID looks invalid. Native ads are disabled.");
  }
}

/**
 * One-time eligibility delay. A Free user's ad placements only become eligible after this long
 * into the dashboard session. It fires once per dashboard session (not per ad slot, not per page
 * navigation) - after it fires, every AdSlot mounted for the rest of the session (including ones
 * shown while audio is generating or a voice is cloning) renders immediately.
 *
 * Lower this (or set it to 0) if you want ads to be eligible right away, e.g. so a slot shown
 * during a short "generating audio..." wait always has a chance to render.
 */
export const ADSTERRA_ELIGIBILITY_DELAY_MS = Number(process.env.NEXT_PUBLIC_ADSTERRA_ELIGIBILITY_DELAY_MS) || 5_000;
