import type { Metadata } from "next";
import ProductArchive from "@/components/sections/ProductArchive";
import Navbar from "@/components/ui/Navbar";
import { getCachedCatalogArchive, getCachedCatalogSegments } from "@/lib/cachedCatalogApi";

export const metadata: Metadata = {
  title: "Product Archive — SICKO SOUL",
  description: "Every Sicko Soul category currently cleared for viewing.",
  openGraph: {
    title: "SICKO SOUL — Product Archive",
    description: "Every piece we let you see. Nothing more.",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [categories, segments] = await Promise.all([getCachedCatalogArchive(), getCachedCatalogSegments()]);

  const liveCategories = categories.filter(category => category.products.length > 0);
  const liveSegmentIds = new Set(liveCategories.map(category => category.segment?.id));
  const liveSegments = segments.filter(segment => liveSegmentIds.has(segment.id));

  if (liveSegments.length === 0) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-black px-gutter pt-36 text-bone-white">
          <p className="font-body text-sm uppercase tracking-[0.18em] text-blood-accent">CATALOG / EMPTY</p>
          <h1 className="mt-5 font-display text-[clamp(4rem,10vw,10rem)] leading-[0.78] tracking-crushed">NO PRODUCT FILES</h1>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main>
        <ProductArchive categories={liveCategories} segments={liveSegments} />
      </main>
    </>
  );
}
