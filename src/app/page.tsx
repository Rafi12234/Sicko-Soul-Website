import Hero from "@/components/sections/Hero";
import Preloader from "@/components/sections/Preloader";
import Segments from "@/components/sections/Segments";
import Navbar from "@/components/ui/Navbar";

/**
 * Holding shell. Sections land here one at a time from Step 4 onward
 * (Manifesto → … → Footer), never inline — see ANTI_PATTERNS.md §6.1.
 */
export default function Home() {
  return (
    <>
      <Preloader />
      <Navbar />
      <main>
        <Hero />
        <Segments />
        <section className="min-h-screen px-gutter pt-bleed">
          <p className="font-stencil text-stamp text-blood-accent">NEXT / MANIFESTO</p>
          <div className="hairline mt-8 max-w-[38rem]" />
        </section>
      </main>
    </>
  );
}
