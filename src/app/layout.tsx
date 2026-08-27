import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import SmoothScroll from "@/components/providers/SmoothScroll";
import CustomCursor from "@/components/ui/CustomCursor";
import NoiseOverlay from "@/components/ui/NoiseOverlay";
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
      <body className="bg-black text-bone-white antialiased" suppressHydrationWarning>
        <SmoothScroll>{children}</SmoothScroll>
        <NoiseOverlay />
        <CustomCursor />
      </body>
    </html>
  );
}
