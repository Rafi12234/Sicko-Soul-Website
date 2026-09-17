import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import ClientRuntime from "@/components/providers/ClientRuntime";
import CustomCursor from "@/components/ui/CustomCursor";
import NoiseOverlay from "@/components/ui/NoiseOverlay";
import SiteAudio from "@/components/ui/SiteAudio";
import RouteTransition from "@/components/ui/RouteTransition";
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
    // Extensions (QuillBot, Grammarly, password managers) stamp attributes onto
    // html/body before hydration; only these two roots skip attribute diffing.
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload the three faces the Preloader renders immediately — without
            this, font-display: swap can substitute a fallback face mid-scramble
            and the glyph-width swap reads as a jittery reflow. */}
        <link rel="preload" href="/fonts/anton-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/pirata-one-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/special-elite-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="bg-black text-bone-white antialiased" suppressHydrationWarning>
        <ClientRuntime />
        <SmoothScroll>{children}</SmoothScroll>
        <RouteTransition />
        <NoiseOverlay />
        <CustomCursor />
        <SiteAudio />
      </body>
    </html>
  );
}
