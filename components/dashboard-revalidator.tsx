"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function DashboardRevalidator() {
  const router = useRouter();

  useEffect(() => {
    const refreshDashboard = () => router.refresh();
    window.addEventListener("pageshow", refreshDashboard);
    return () => window.removeEventListener("pageshow", refreshDashboard);
  }, [router]);

  return null;
}
