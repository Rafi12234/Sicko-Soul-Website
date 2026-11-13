import Cred from "@/components/sections/Cred";
import Drop from "@/components/sections/Drop";
import Feedback from "@/components/sections/Feedback";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Lookbook from "@/components/sections/Lookbook";
import Manifesto from "@/components/sections/Manifesto";
import Rack from "@/components/sections/Rack";
import Streets from "@/components/sections/Streets";
import Navbar from "@/components/ui/Navbar";
import StatementBand from "@/components/ui/StatementBand";
import { STATEMENTS } from "@/data/statements";
import { getSiteContent, mergeCopy } from "@/lib/siteContent";
import { SiteContentProvider } from "@/components/providers/SiteContentContext";
import { getCachedCatalogArchive, getCachedCatalogSegments } from "@/lib/cachedCatalogApi";
import { getHomepageMedia } from "@/lib/siteMedia"; // SICKO_DYNAMIC_SITE_MEDIA

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogCategories, segments, siteMedia, content] = await Promise.all([getCachedCatalogArchive(), getCachedCatalogSegments(), getHomepageMedia(), getSiteContent()]);
  const bands = mergeCopy(STATEMENTS, content.statementBands);
  const liveCategories = catalogCategories.filter(category => category.products.length > 0);
  const liveSegmentIds = new Set(liveCategories.map(category => category.segment?.id));
  const liveSegments = segments.filter(segment => liveSegmentIds.has(segment.id));

  return (
    <SiteContentProvider value={content}>
      <Navbar />
      <main>
        <Hero videoUrl={siteMedia.heroVideoUrl} />
        <Manifesto />
        <StatementBand statement={bands.entry} />
        <Drop videoUrl={siteMedia.dropVideoUrl} />
        <Rack catalogCategories={liveCategories} segments={liveSegments} />
        <Streets images={siteMedia.streetsImages} />
        <StatementBand statement={bands.seen} />
        {siteMedia.lookbookFrames.length > 0 && <Lookbook frames={siteMedia.lookbookFrames} />}
        <StatementBand statement={bands.ask} />
        <Cred />
        <Feedback />
      </main>
      <Footer />
    </SiteContentProvider>
  );
}
