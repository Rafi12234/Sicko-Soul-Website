import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import RuntimeShell from "@/components/providers/RuntimeShell";
import { SiteContentProvider } from "@/components/providers/SiteContentContext";
import { getSiteContent, mergeCopy } from "@/lib/siteContent";
import { MEDIA } from "@/lib/media";
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

export default async function RootLayout({ children }: { children: ReactNode }) {
  const content = await getSiteContent();
  const audio = mergeCopy({ soundtrackUrl: MEDIA.audio.soundtrack }, content.audio);
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
        <SiteContentProvider value={content}><RuntimeShell soundtrackUrl={audio.soundtrackUrl}>{children}</RuntimeShell></SiteContentProvider>
      </body>
    </html>
  );
}
