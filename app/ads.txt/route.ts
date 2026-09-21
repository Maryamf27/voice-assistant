import { getAdsTxtLine } from "@/lib/adsense";

/**
 * Serves /ads.txt from the configured AdSense publisher ID, so there is no placeholder file to
 * forget about. Until NEXT_PUBLIC_ADSENSE_CLIENT_ID is set this returns 404 (no fake ads.txt).
 */
export function GET() {
  const line = getAdsTxtLine();
  if (!line) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(`${line}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
