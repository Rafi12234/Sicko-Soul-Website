import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ClientRuntime from "@/components/providers/ClientRuntime";
import Preloader from "@/components/sections/Preloader";
import CustomCursor from "@/components/ui/CustomCursor";
import NoiseOverlay from "@/components/ui/NoiseOverlay";
import SiteAudio from "@/components/ui/SiteAudio";
import RouteTransition from "@/components/ui/RouteTransition";
import { CLOUDINARY_ORIGIN } from "@/lib/media";
import "./globals.css";

export const metadata: Metadata = {
  title: "SICKO SOUL — For The Ones Who Were Never Invited",
  description:
    "Not made for comfort. Made for consequence. Limited runs, no restocks, no apologies.",
  openGraph: {
    title: "SICKO SOUL",
    description: "You don't wear this. You survive in it.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Warm the media CDN during the entrance ritual. No visual change,
            but the first hero/product requests avoid a cold DNS/TLS handshake. */}
        <link rel="preconnect" href={CLOUDINARY_ORIGIN} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={CLOUDINARY_ORIGIN} />

        {/* Faces required by the entrance ritual before the rest of the page. */}
        <link
          rel="preload"
          href="/fonts/anton-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/pirata-one-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/special-elite-400.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-black text-bone-white antialiased" suppressHydrationWarning>
        <ClientRuntime />

        {/* Fresh document load = entry ritual. Internal routes keep this layout alive. */}
        <Preloader />

        <SmoothScroll>{children}</SmoothScroll>

        <RouteTransition />
        <NoiseOverlay />
        <CustomCursor />

        {/* Persistent across every client-side route. */}
        <SiteAudio />
      </body>
    </html>
  );
}
