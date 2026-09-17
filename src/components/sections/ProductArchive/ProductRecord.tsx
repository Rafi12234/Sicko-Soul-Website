"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { PRODUCTS_COPY, type ArchiveProduct } from "@/data/products";
import { useCartStore } from "@/store/useCartStore";
import styles from "./ProductArchive.module.css";

type ProductRecordProps = {
  product: ArchiveProduct;
  ordinal: number;
};

export default function ProductRecord({ product, ordinal }: ProductRecordProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const wornRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const [cartSignal, setCartSignal] = useState("ADD TO CART");
  const addItem = useCartStore((state) => state.addItem);
  const isReverse = ordinal % 2 === 1;

  useLayoutEffect(() => {
    const root = rootRef.current;
    const still = stillRef.current;
    const worn = wornRef.current;
    if (!root || !still) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          hoverable: "(hover: hover) and (pointer: fine)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (self) => {
          const { hoverable, reduced } = self.conditions as Record<string, boolean>;
          if (!hoverable || reduced) return;

          const driftStillX = gsap.quickTo(still, "x", { duration: 0.8, ease: EASE.expo });
          const driftStillY = gsap.quickTo(still, "y", { duration: 0.8, ease: EASE.expo });
          const driftWornX = worn
            ? gsap.quickTo(worn, "x", { duration: 0.9, ease: EASE.expo })
            : null;
          const driftWornY = worn
            ? gsap.quickTo(worn, "y", { duration: 0.9, ease: EASE.expo })
            : null;

          const onMove = (event: PointerEvent) => {
            const rect = root.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            driftStillX(x * -16);
            driftStillY(y * -10);
            driftWornX?.(x * 22);
            driftWornY?.(y * 14);
          };

          const onEnter = () => {
            gsap.to(scanRef.current, {
              yPercent: 5200,
              autoAlpha: 0.8,
              duration: 0.8,
              ease: EASE.inOut,
              overwrite: true,
            });
            gsap.to(statusRef.current, {
              color: "#f2f0eb",
              backgroundColor: "#8a0303",
              duration: 0.25,
              overwrite: true,
            });
          };

          const onLeave = () => {
            driftStillX(0);
            driftStillY(0);
            driftWornX?.(0);
            driftWornY?.(0);
            gsap.set(scanRef.current, { yPercent: 0, autoAlpha: 0 });
            gsap.to(statusRef.current, {
              color: "#8a0303",
              backgroundColor: "transparent",
              duration: 0.3,
              overwrite: true,
            });
          };

          root.addEventListener("pointermove", onMove);
          root.addEventListener("pointerenter", onEnter);
          root.addEventListener("pointerleave", onLeave);

          return () => {
            root.removeEventListener("pointermove", onMove);
            root.removeEventListener("pointerenter", onEnter);
            root.removeEventListener("pointerleave", onLeave);
          };
        },
      );
    }, root);

    return () => ctx.revert();
  }, [product.id]);

  const addToCart = () => {
    addItem(product.id, product.defaultSize, 1);
    setCartSignal("ADDED / CART +1");
    window.setTimeout(() => setCartSignal("ADD TO CART"), 1300);
  };

  const buyNow = () => {
    router.push(
      `/buy-now?product=${encodeURIComponent(product.id)}&size=${encodeURIComponent(product.defaultSize)}&qty=1`,
    );
  };

  return (
    <article
      ref={rootRef}
      className={`${styles.record} archive-record relative border-t border-bone-white/15 py-[10vh]`}
      data-cursor="hover"
    >
      <div className="mb-7 flex items-center justify-between gap-4 lg:hidden">
        <span className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
          {PRODUCTS_COPY.record} / {product.index}
        </span>
        <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
          {String(ordinal + 1).padStart(2, "0")}
        </span>
      </div>

      <div
        className={`grid items-start gap-8 lg:grid-cols-12 lg:gap-x-[4vw] ${
          isReverse ? styles.recordReverse : ""
        }`}
      >
        <div
          className={`${styles.mediaCluster} relative lg:col-span-8 ${
            isReverse ? "lg:col-start-5" : "lg:col-start-1"
          }`}
        >
          <span
            aria-hidden
            className={`${styles.recordNumeral} pointer-events-none absolute -top-[0.18em] z-0 font-display text-outline-2`}
          >
            {product.index}
          </span>

          <Link
            href={`/products/${product.id}`}
            aria-label={`Open ${product.name} product file`}
            className="block"
          >
            <div
              ref={stillRef}
              className={`${styles.primaryFrame} theme-light relative z-10 ml-0 w-[88%] bg-black p-2 shadow-print md:w-[74%] lg:w-[69%]`}
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                <Image
                  src={product.still}
                  alt={product.alt}
                  fill
                  sizes="(max-width: 768px) 90vw, (max-width: 1200px) 58vw, 45vw"
                  className="media-product object-cover transition-transform duration-700 ease-hard hover:scale-[1.02]"
                />
                <span aria-hidden className={`${styles.mediaVignette} absolute inset-0`} />
                <span
                  ref={scanRef}
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-blood-accent opacity-0"
                />
                <span className="absolute left-3 top-3 z-20 font-stencil text-[0.5rem] tracking-stencil text-bone-white/65">
                  {PRODUCTS_COPY.still} / {product.index}
                </span>
              </div>
            </div>
          </Link>

          {product.worn ? (
            <div
              ref={wornRef}
              className={`${styles.secondaryFrame} theme-light absolute bottom-[-8%] right-0 z-20 w-[48%] bg-black p-2 shadow-print md:w-[43%] lg:w-[39%]`}
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-off-black">
                <Image
                  src={product.worn}
                  alt={`${product.name} worn`}
                  fill
                  sizes="(max-width: 768px) 48vw, (max-width: 1200px) 30vw, 24vw"
                  className="media-product object-cover object-[50%_10%]"
                />
                <span aria-hidden className={`${styles.mediaVignette} absolute inset-0`} />
                <span className="absolute bottom-3 left-3 z-20 bg-black/70 px-2 py-1 font-stencil text-[0.48rem] tracking-stencil text-bone-white/75">
                  {PRODUCTS_COPY.worn}
                </span>
              </div>
            </div>
          ) : (
            <div className={`${styles.noBody} absolute bottom-[-6%] right-0 z-20 w-[48%] border border-bone-white/15 bg-black p-5 md:w-[40%]`}>
              <span className="block h-px w-10 bg-blood-accent" />
              <span className="mt-4 block font-stencil text-[0.5rem] leading-[1.8] tracking-stencil text-concrete-gray">
                {PRODUCTS_COPY.noWorn}
              </span>
            </div>
          )}
        </div>

        <div
          className={`${styles.recordMeta} relative z-30 mt-14 lg:col-span-4 lg:mt-[8vh] ${
            isReverse ? "lg:col-start-1 lg:row-start-1" : "lg:col-start-9"
          }`}
        >
          <div className="hidden items-center justify-between gap-5 lg:flex">
            <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">
              {PRODUCTS_COPY.record} / {product.index}
            </span>
            <span className="h-px flex-1 bg-bone-white/15" />
          </div>

          <h3 className="mt-5 max-w-[9ch] font-display text-[clamp(3rem,6vw,6.8rem)] leading-[0.78] tracking-crushed text-bone-white">
            {product.name}
          </h3>

          <p className="mt-6 font-stencil text-[0.58rem] tracking-stencil text-blood-accent">
            {product.spec}
          </p>
          <p className="mt-5 max-w-[28ch] font-body text-body-lg text-bone-white/65">
            {product.line}
          </p>

          <div className="mt-7 flex items-center gap-4 border-y border-bone-white/15 py-4">
            <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">PRICE</span>
            <span className="ml-auto font-body text-[1.1rem] font-semibold text-bone-white">
              {product.price}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span
              ref={statusRef}
              className="border border-blood-accent px-3 py-2 font-stencil text-[0.48rem] tracking-stencil text-blood-accent"
            >
              {product.worn ? `02 ${PRODUCTS_COPY.recoveredPlural}` : `01 ${PRODUCTS_COPY.recovered}`}
            </span>
            <span className="hidden font-stencil text-[0.48rem] tracking-stencil text-concrete-gray xl:block">
              {PRODUCTS_COPY.inspect}
            </span>
          </div>

          <div className="mt-7 grid gap-2">
            <Link
              href={`/products/${product.id}`}
              className={`${styles.recordAction} group relative flex items-center justify-between overflow-hidden border border-bone-white/20 px-4 py-3`}
            >
              <span className="relative z-10 font-stencil text-[0.52rem] tracking-stencil text-bone-white">
                OPEN FULL FILE
              </span>
              <span className="relative z-10 font-display text-lg text-blood-accent">↗</span>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={addToCart}
                className={`${styles.recordAction} group relative overflow-hidden border border-bone-white/20 px-3 py-3 text-left`}
              >
                <span className="relative z-10 font-stencil text-[0.47rem] tracking-stencil text-bone-white">
                  {cartSignal}
                </span>
              </button>
              <button
                type="button"
                onClick={buyNow}
                className={`${styles.buyAction} clip-cut group relative overflow-hidden bg-blood-accent px-3 py-3 text-left`}
              >
                <span className="relative z-10 font-stencil text-[0.47rem] tracking-stencil text-bone-white">
                  BUY NOW
                </span>
              </button>
            </div>
            <p className="font-stencil text-[0.43rem] leading-[1.7] tracking-stencil text-concrete-gray">
              QUICK ACTION SIZE / {product.defaultSize} · CHANGE SIZE IN CART OR PRODUCT FILE
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
