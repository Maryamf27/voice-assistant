"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function DashboardRevalidator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");

  useEffect(() => {
    if (checkout !== "success") return;

    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshDashboard = () => {
      router.refresh();
      retryCount += 1;
      if (retryCount < 20) {
        retryTimer = setTimeout(refreshDashboard, 1500);
      }
    };

    refreshDashboard();
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [checkout]);

  return null;
}
