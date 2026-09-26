"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { findProductById } from "@/data/products";
import { getCollection } from "@/lib/customerApi";
import { collectionLabel, humanizeStatus } from "@/lib/commerce";
import type { CollectionRecord } from "@/types/commerce";
import RecordShell from "@/components/ui/RecordShell";
import SickoButton from "@/components/ui/SickoButton";

function countdown(target?: string | null) {
  if (!target) return null;
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function DropFile({ slug }: { slug: string }) {
  const [collection, setCollection] = useState<CollectionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [, forceTick] = useState(0);

  useEffect(() => {
    let alive = true;
    getCollection(slug).then((result) => {
      if (alive) {
        setCollection(result);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [slug]);

  useEffect(() => {
    const timer = window.setInterval(() => forceTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <RecordShell index="09" eyebrow="VAULT / OPENING" title="CLEARING ACCESS">
        <div className="h-px animate-pulse bg-blood-accent" />
      </RecordShell>
    );
  }

  if (!collection) {
    return (
      <RecordShell index="00" eyebrow="VAULT / NO RECORD" title="DROP NOT FOUND">
        <SickoButton href="/drops" tone="blood">RETURN TO VAULT</SickoButton>
      </RecordShell>
    );
  }

  const clock =
    collection.status === "LIVE"
      ? countdown(collection.closesAt)
      : collection.status === "SCHEDULED"
        ? countdown(collection.opensAt)
        : null;

  const accessBlocked = collection.status === "DRAFT" || collection.status === "SCHEDULED" || collection.status === "ARCHIVED";

  return (
    <RecordShell
      index="09"
      eyebrow={`${collection.code} / ${collectionLabel(collection.status)}`}
      title={collection.name}
      subtitle={collection.tagline}
    >
      <div className="mb-12 grid gap-6 border-y border-bone-white/15 py-6 md:grid-cols-3">
        <div><span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-concrete-gray">STATUS</span><p className="mt-2 font-display text-3xl tracking-crushed">{humanizeStatus(collection.status)}</p></div>
        <div><span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-concrete-gray">RELEASE</span><p className="mt-2 font-display text-3xl tracking-crushed">{collection.releaseYear ?? "—"}</p></div>
        <div><span className="font-body text-xs font-semibold uppercase tracking-[0.16em] text-concrete-gray">{collection.status === "LIVE" ? "VAULT CLOSES IN" : collection.status === "SCHEDULED" ? "ACCESS IN" : "CLOCK"}</span><p className="mt-2 font-display text-3xl tracking-crushed text-blood-accent">{clock ?? (collection.status === "SEALED" ? "SEALED" : "—")}</p></div>
      </div>

      {accessBlocked && (
        <div className="mb-10 border-l-2 border-blood-accent bg-blood-accent/10 p-6">
          <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">ACCESS CONDITION</span>
          <p className="mt-3 max-w-[48ch] font-display text-[clamp(2.4rem,5vw,5rem)] leading-[0.84] tracking-crushed">{collection.status === "SCHEDULED" ? "THE FILE OPENS WHEN THE CLOCK HITS ZERO." : "THIS FILE IS NOT CLEARED FOR PURCHASE."}</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {collection.products.map((entry) => {
          const lookup = findProductById(entry.productId);
          if (!lookup) return null;

          const locked = entry.sealed || collection.status === "SEALED" || accessBlocked;
          const content = (
            <>
              <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                <Image
                  src={lookup.product.still}
                  alt={lookup.product.alt}
                  fill
                  sizes="(max-width:768px) 100vw, 33vw"
                  className={`media-product object-cover transition duration-700 ${locked ? "grayscale brightness-[.28] contrast-125" : "group-hover:scale-[1.03]"}`}
                />
                {locked && <div className="absolute inset-0 grid place-items-center bg-black/35"><span className="border border-blood-accent bg-black px-4 py-3 font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">SEALED</span></div>}
              </div>
              <div className="border-x border-b-bone-white/15 p-5">
                <span className="font-body text-[0.66rem] font-semibold uppercase tracking-[0.17em] text-blood-accent">{lookup.category.name}</span>
                <h2 className="mt-2 font-display text-[2.4rem] leading-[0.86] tracking-crushed">{lookup.product.name}</h2>
                <p className="mt-4 font-body text-sm font-semibold uppercase tracking-[0.12em] text-concrete-gray">{locked ? "ACCESS DENIED" : "OPEN GARMENT FILE →"}</p>
              </div>
            </>
          );

          if (locked) return <article key={entry.productId} className="group">{content}</article>;
          return <Link key={entry.productId} href={`/products/${entry.productId}`} className="group">{content}</Link>;
        })}
      </div>
    </RecordShell>
  );
}
