"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function DashboardRevalidator() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  useEffect(() => {
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshDashboard = () => {
      router.refresh();
      if (checkout === "success" && retryCount < 4) {
        retryCount += 1;
        retryTimer = setTimeout(refreshDashboard, 1500);
      }
    };

    window.addEventListener("pageshow", refreshDashboard);
    refreshDashboard();
    return () => {
      window.removeEventListener("pageshow", refreshDashboard);
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [checkout, pathname, router]);

  return null;
}
