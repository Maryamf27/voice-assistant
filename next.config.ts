import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js defaults the client-side Router Cache for dynamically-rendered
    // routes (which the whole /dashboard tree is, since it reads cookies for
    // auth) to a 0s stale time — every single navigation, including clicking
    // back to a page you were just on, refetches from the server.
    // This keeps a navigated-away-from page's RSC payload in the browser's
    // Router Cache for 30s (and Link prefetch={true}/router.prefetch data for
    // 3 min), so switching between dashboard pages repeatedly is instant
    // instead of re-hitting Supabase every time.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};
export default nextConfig;
