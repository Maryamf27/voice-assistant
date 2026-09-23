import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The whole /dashboard tree renders dynamically (it reads cookies for auth),
    // and Next.js gives dynamically-rendered routes a 0s client Router Cache by
    // default — every navigation, including clicking back to a page you were
    // just on, refetches from the server.
    //
    // `dynamic` covers pages reached by an ordinary prefetch; `static` covers
    // pages prefetched with `prefetch={true}`, which is what the dashboard
    // sidebar uses. Both are set well above a browsing session's back-and-forth
    // so that re-visiting a dashboard page is served from memory with no
    // network round trip and therefore no loading state at all.
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
  },
};
export default nextConfig;
