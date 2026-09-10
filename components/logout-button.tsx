"use client";
import { useState } from "react";
import { IconLogout } from "@/components/icons";

export function LogoutButton() {
  const [loading, setLoading] = useState(false);
  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }
  return (
    <button
      onClick={logout}
      disabled={loading}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-muted transition hover:bg-base-surface hover:text-ink-primary disabled:opacity-60"
    >
      <IconLogout className="h-4 w-4" />
      {loading ? "Signing out…" : "Sign out"}
    </button>
  );
}
