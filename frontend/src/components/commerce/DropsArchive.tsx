"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RecordShell from "@/components/ui/RecordShell";
import { listCollections } from "@/lib/customerApi";
import { collectionLabel } from "@/lib/commerce";
import type { CollectionRecord } from "@/types/commerce";

export default function DropsArchive() {
  const [collections, setCollections] = useState<CollectionRecord[]>([]);

  useEffect(() => {
    listCollections().then(setCollections);
  }, []);

  return (
    <RecordShell
      index="08"
      eyebrow="DROP ARCHIVE / VAULT INDEX"
      title="THE VAULT"
      subtitle="Live, scheduled and sealed Sicko Soul collections. What is closed stays closed."
    >
      <div className="grid gap-5">
        {collections.map((collection, index) => (
          <Link
            key={collection.id}
            href={`/drops/${collection.slug}`}
            className="group relative overflow-hidden border border-bone-white/15 bg-off-black p-6 transition-colors hover:border-blood-accent md:p-8"
          >
            <span aria-hidden className="pointer-events-none absolute right-3 top-[-1rem] font-display text-[9rem] leading-none text-outline-2 opacity-[0.08]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
              <div>
                <div className="flex items-center gap-4">
                  <span className={`h-2 w-2 ${collection.status === "LIVE" ? "animate-pulse bg-blood-accent shadow-[0_0_24px_rgba(138,3,3,.9)]" : "bg-concrete-gray/40"}`} />
                  <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">{collectionLabel(collection.status)}</span>
                </div>
                <h2 className="mt-5 font-display text-[clamp(3.5rem,8vw,8rem)] leading-[0.78] tracking-crushed transition-transform duration-500 group-hover:translate-x-2">{collection.name}</h2>
                {collection.tagline && <p className="mt-5 max-w-[48ch] font-body text-lg leading-relaxed text-bone-white/60">{collection.tagline}</p>}
              </div>
              <div className="border-l border-blood-accent pl-5">
                <span className="font-body text-xs font-semibold uppercase tracking-[0.17em] text-concrete-gray">{collection.code}</span>
                <p className="mt-3 font-display text-3xl">OPEN FILE →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </RecordShell>
  );
}
