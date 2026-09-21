import type { Metadata } from "next";
import "./globals.css";

import { AudioPlaybackProvider } from "@/components/audio-playback";
import {
  ADSENSE_CLIENT_ID,
  ADSENSE_SCRIPT_SRC,
} from "@/lib/adsense";

export const metadata: Metadata = {
  title: "Voice Studio",
  description: "Your premium AI voice workspace",

  ...(ADSENSE_CLIENT_ID
    ? {
        other: {
          "google-adsense-account": ADSENSE_CLIENT_ID,
        },
      }
    : {}),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />

        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {ADSENSE_SCRIPT_SRC ? (
          <script
            async
            src={ADSENSE_SCRIPT_SRC}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>

      <body>
        <AudioPlaybackProvider>
          {children}
        </AudioPlaybackProvider>
      </body>
    </html>
  );
}