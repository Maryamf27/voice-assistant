import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Voice Studio", description: "Your AI voice workspace" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
