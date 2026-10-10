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
import { getCatalogArchive } from "@/lib/catalogApi";
import { getHomepageMedia } from "@/lib/siteMedia"; // SICKO_DYNAMIC_SITE_MEDIA

export const dynamic = "force-dynamic";

export default async function Home() {
  const [catalogCategories, siteMedia] = await Promise.all([getCatalogArchive(), getHomepageMedia()]);

  return (
    <>
      <Navbar />
      <main>
        <Hero videoUrl={siteMedia.heroVideoUrl} />
        <Manifesto />
        <StatementBand statement={STATEMENTS.entry} />
        <Drop videoUrl={siteMedia.dropVideoUrl} />
        <Rack catalogCategories={catalogCategories} />
        <Streets />
        <StatementBand statement={STATEMENTS.seen} />
        {siteMedia.lookbookFrames.length > 0 && <Lookbook frames={siteMedia.lookbookFrames} />}
        <StatementBand statement={STATEMENTS.ask} />
        <Cred />
        <Feedback />
      </main>
      <Footer />
    </>
  );
}
