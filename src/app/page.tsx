import Cred from "@/components/sections/Cred";
import Drop from "@/components/sections/Drop";
import Feedback from "@/components/sections/Feedback";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Lookbook from "@/components/sections/Lookbook";
import Manifesto from "@/components/sections/Manifesto";
import Preloader from "@/components/sections/Preloader";
import Rack from "@/components/sections/Rack";
import Segments from "@/components/sections/Segments";
import Streets from "@/components/sections/Streets";
import Navbar from "@/components/ui/Navbar";
import StatementBand from "@/components/ui/StatementBand";
import { STATEMENTS } from "@/data/statements";

export default function Home() {
  return (
    <>
      <Preloader />
      <Navbar />
      <main>
        <Hero />
        <Segments />
        {/* Text-only breather before the image-heavy run of sections. */}
        <Manifesto />
        <StatementBand statement={STATEMENTS.entry} />
        <Rack />
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
