"use client";
import { useState } from "react";
export function LogoutButton() { const [loading, setLoading] = useState(false); async function logout() { setLoading(true); await fetch("/api/auth/logout", { method: "POST" }); window.location.assign("/login"); } return <button onClick={logout} disabled={loading} className="rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 disabled:opacity-60">{loading ? "Signing out…" : "Sign out"}</button>; }
