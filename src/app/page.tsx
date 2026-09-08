import Cred from "@/components/sections/Cred";
import Crew from "@/components/sections/Crew";
import Drop from "@/components/sections/Drop";
import Footer from "@/components/sections/Footer";
import Hero from "@/components/sections/Hero";
import Lookbook from "@/components/sections/Lookbook";
import Manifesto from "@/components/sections/Manifesto";
import Preloader from "@/components/sections/Preloader";
import Rack from "@/components/sections/Rack";
import Segments from "@/components/sections/Segments";
import Streets from "@/components/sections/Streets";
import Navbar from "@/components/ui/Navbar";

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
        <Rack />
        <Streets />
        <Lookbook />
        <Drop />
        <Cred />
        <Crew />
      </main>
      <Footer />
    </>
  );
}
