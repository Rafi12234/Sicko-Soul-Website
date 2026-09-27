import Cred from "@/components/sections/Cred";
import Drop from "@/components/sections/Drop";
import Feedback from "@/components/sections/Feedback";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Lookbook from "@/components/sections/Lookbook";
import Manifesto from "@/components/sections/Manifesto";
import Rack from "@/components/sections/Rack";
import Segments from "@/components/sections/Segments";
import Streets from "@/components/sections/Streets";
import Navbar from "@/components/ui/Navbar";
import StatementBand from "@/components/ui/StatementBand";
import { STATEMENTS } from "@/data/statements";
import { getCatalogArchive } from "@/lib/catalogApi";

export const dynamic = "force-dynamic";

export default async function Home() {
  const catalogCategories = await getCatalogArchive();

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Segments categories={catalogCategories} />
        <Manifesto />
        <StatementBand statement={STATEMENTS.entry} />
        <Rack catalogCategories={catalogCategories} />
        <Streets />
        <StatementBand statement={STATEMENTS.seen} />
        <Lookbook />
        <Drop />
        <StatementBand statement={STATEMENTS.ask} />
        <Cred />
        <Feedback />
      </main>
      <Footer />
    </>
  );
}
