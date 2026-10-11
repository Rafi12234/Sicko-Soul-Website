import Navbar from "@/components/ui/Navbar";

/**
 * Lightweight route-level pending state. No fake products or category data:
 * Next.js replaces this with the real, database-backed archive when ready.
 */
export default function ProductsLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-black px-gutter pb-[14vh] pt-32 text-bone-white" aria-busy="true">
        <div className="flex items-center justify-between gap-5 border-b border-bone-white/15 pb-4">
          <p className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
            PRODUCT ARCHIVE / OPEN FILE
          </p>
          <p className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
            RETRIEVING THE RECORDS
          </p>
        </div>
        <section className="relative flex min-h-[58svh] flex-col justify-center" aria-label="Loading product archive">
          <p className="font-stencil text-[0.6rem] tracking-stencil text-concrete-gray">
            SICKO SOUL / SEARCHING CATALOG
          </p>
          <h1 className="text-distress mt-8 font-display text-[clamp(4rem,11vw,11rem)] leading-[0.79] tracking-crushed">
            THE EVIDENCE
          </h1>
          <div className="mt-12 h-px max-w-2xl overflow-hidden bg-bone-white/15">
            <div className="h-full w-1/3 animate-pulse bg-blood-accent" />
          </div>
          <p className="mt-4 font-stencil text-[0.55rem] tracking-stencil text-bone-white/60" role="status">
            LOADING LIVE FILES...
          </p>
        </section>
      </main>
    </>
  );
}
