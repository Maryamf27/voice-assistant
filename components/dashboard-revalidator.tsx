"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Polls for fresh dashboard data after returning from an external checkout
 * redirect (`?checkout=success`), since the payment provider's webhook that
 * updates the subscription can land a moment after the user is redirected
 * back. This intentionally does NOT depend on `pathname` — it must only run
 * for the checkout flow, never on ordinary in-app navigation, or every click
 * on a sidebar link would force a full server refetch and defeat the
 * Router Cache (see `staleTimes` in next.config.ts).
 */
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
    // Only the checkout param should ever restart this loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkout]);

  return null;
}
