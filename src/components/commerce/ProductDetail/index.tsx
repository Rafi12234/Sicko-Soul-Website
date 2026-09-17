"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { useCartStore } from "@/store/useCartStore";
import type { ArchiveCategory, ArchiveProduct } from "@/data/products";
import styles from "./ProductDetail.module.css";

type ProductDetailProps = {
  product: ArchiveProduct;
  category: ArchiveCategory;
};

export default function ProductDetail({ product, category }: ProductDetailProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(product.defaultSize);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState<"still" | "worn">("still");
  const [cartSignal, setCartSignal] = useState("ADD TO CART");
  const addItem = useCartStore((state) => state.addItem);

  const imageSrc = activeImage === "worn" && product.worn ? product.worn : product.still;
  const imageAlt = activeImage === "worn" ? `${product.name} worn` : product.alt;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const titleSplit = new SplitText(".detail-title", { type: "chars" });
      const tl = gsap.timeline({ defaults: { ease: EASE.expo } });

      tl.from(".detail-kicker", { y: 18, autoAlpha: 0, duration: 0.55 })
        .from(
          titleSplit.chars,
          { yPercent: 120, rotate: 5, autoAlpha: 0, duration: 0.95, stagger: 0.025 },
          "-=0.2",
        )
        .from(".detail-viewer", { clipPath: "inset(0 0 100% 0)", duration: 1.0 }, "-=0.72")
        .from(
          ".detail-panel > *",
          { y: 24, autoAlpha: 0, duration: 0.65, stagger: 0.055 },
          "-=0.7",
        );

      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        const moveX = gsap.quickTo(viewer, "x", { duration: 0.8, ease: EASE.expo });
        const moveY = gsap.quickTo(viewer, "y", { duration: 0.8, ease: EASE.expo });

        const onMove = (event: PointerEvent) => {
          const rect = viewer.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          moveX(x * 9);
          moveY(y * 6);
        };
        const onLeave = () => {
          moveX(0);
          moveY(0);
        };

        viewer.addEventListener("pointermove", onMove);
        viewer.addEventListener("pointerleave", onLeave);
        return () => {
          viewer.removeEventListener("pointermove", onMove);
          viewer.removeEventListener("pointerleave", onLeave);
        };
      });

      return () => titleSplit.revert();
    }, root);

    return () => ctx.revert();
  }, [product.id]);

  const swapImage = (next: "still" | "worn") => {
    if (next === "worn" && !product.worn) return;
    if (next === activeImage) return;
    gsap.to(viewerRef.current, {
      autoAlpha: 0.3,
      x: next === "worn" ? 16 : -16,
      duration: 0.22,
      ease: EASE.inOut,
      onComplete: () => {
        setActiveImage(next);
        gsap.fromTo(
          viewerRef.current,
          { autoAlpha: 0.3, x: next === "worn" ? -16 : 16 },
          { autoAlpha: 1, x: 0, duration: 0.5, ease: EASE.expo },
        );
      },
    });
  };

  const addToCart = () => {
    addItem(product.id, size, quantity);
    setCartSignal(`FILED / +${quantity}`);
    window.setTimeout(() => setCartSignal("ADD TO CART"), 1400);
  };

  const buyNow = () => {
    router.push(
      `/buy-now?product=${encodeURIComponent(product.id)}&size=${encodeURIComponent(size)}&qty=${quantity}`,
    );
  };

  const related = category.products.filter((entry) => entry.id !== product.id).slice(0, 3);

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-black text-bone-white">
      <section className={`${styles.hero} relative min-h-screen border-b border-bone-white/15 px-gutter pb-[10vh] pt-32`}>
        <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <span
          aria-hidden
          className={`${styles.fileNumber} text-distress pointer-events-none absolute font-display text-outline-2`}
        >
          {product.index}
        </span>

        <div className="relative z-10 mb-[8vh] flex flex-wrap items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
          <div className="detail-kicker flex items-center gap-3">
            <span className="h-px w-10 bg-blood-accent" />
            <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">
              PRODUCT FILE / {category.index}.{product.index}
            </span>
          </div>
          <Link
            href="/products"
            className="detail-kicker font-stencil text-[0.5rem] tracking-stencil text-concrete-gray transition-colors hover:text-bone-white"
          >
            ← BACK TO ARCHIVE
          </Link>
        </div>

        <div className="relative z-10 grid gap-12 xl:grid-cols-12 xl:gap-x-[5vw]">
          <div className="xl:col-span-7">
            <div className="split-mask pb-3">
              <h1 className="detail-title text-distress max-w-[9ch] font-display text-[clamp(4.8rem,11vw,11rem)] leading-[0.72] tracking-crushed text-bone-white">
                {product.name}
              </h1>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
                {category.name}
              </span>
              <span className="h-px flex-1 bg-bone-white/15" />
              <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">
                {product.spec}
              </span>
            </div>

            <div className={`${styles.viewerWrap} detail-viewer relative mt-8`}>
              <div
                ref={viewerRef}
                className={`${styles.viewer} theme-light relative w-[92%] bg-black p-2 shadow-print md:w-[82%]`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                  <Image
                    key={imageSrc}
                    src={imageSrc}
                    alt={imageAlt}
                    fill
                    priority
                    sizes="(max-width: 768px) 92vw, 58vw"
                    className={`media-product object-cover ${activeImage === "worn" ? "object-[50%_10%]" : ""}`}
                  />
                  <span aria-hidden className={`${styles.vignette} absolute inset-0`} />
                  <span className="absolute left-4 top-4 bg-black/70 px-2 py-1 font-stencil text-[0.48rem] tracking-stencil text-bone-white/75">
                    FRAME / {activeImage === "worn" ? "ON BODY" : "OBJECT"}
                  </span>
                  <span className={`${styles.scan} pointer-events-none absolute inset-x-0 top-[22%] h-px bg-blood-accent/70`} />
                </div>
              </div>

              <div className="absolute bottom-[-1.2rem] right-0 z-20 flex gap-2">
                <button
                  type="button"
                  onClick={() => swapImage("still")}
                  aria-pressed={activeImage === "still"}
                  className={`${styles.frameButton} border border-bone-white/20 bg-black px-3 py-3 font-stencil text-[0.48rem] tracking-stencil ${
                    activeImage === "still" ? "text-blood-accent" : "text-concrete-gray"
                  }`}
                >
                  01 / OBJECT
                </button>
                {product.worn && (
                  <button
                    type="button"
                    onClick={() => swapImage("worn")}
                    aria-pressed={activeImage === "worn"}
                    className={`${styles.frameButton} border border-bone-white/20 bg-black px-3 py-3 font-stencil text-[0.48rem] tracking-stencil ${
                      activeImage === "worn" ? "text-blood-accent" : "text-concrete-gray"
                    }`}
                  >
                    02 / ON BODY
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className={`${styles.panel} detail-panel self-end xl:col-span-5 xl:pb-[4vh]`}>
            <div className="flex items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
              <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">ASKING PRICE</span>
              <span className="font-body text-[1.35rem] font-semibold text-bone-white">{product.price}</span>
            </div>

            <p className="mt-7 font-blackletter text-[clamp(2.2rem,4vw,4rem)] leading-[0.92] text-bone-white">
              {product.line}
            </p>
            <p className="mt-6 max-w-[39ch] font-body text-body-lg text-bone-white/65">
              {product.description}
            </p>

            <div className="mt-8 border-y border-bone-white/15 py-6">
              <div className="flex items-center justify-between gap-5">
                <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">SELECT SIZE</span>
                <span className="font-stencil text-[0.48rem] tracking-stencil text-blood-accent">REQUIRED</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {product.sizes.map((entry) => (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setSize(entry)}
                    aria-pressed={size === entry}
                    className={`${styles.sizeButton} border px-3 py-3 font-display text-xl ${
                      size === entry
                        ? "border-blood-accent bg-blood-accent text-bone-white"
                        : "border-bone-white/20 text-concrete-gray"
                    }`}
                  >
                    {entry}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between border-b border-bone-white/15 pb-6">
              <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">QUANTITY</span>
              <div className="flex items-center border border-bone-white/20">
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="h-10 w-10 font-display text-xl text-bone-white hover:bg-bone-white hover:text-black"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="flex h-10 min-w-12 items-center justify-center border-x border-bone-white/20 font-stencil text-[0.58rem] tracking-stencil">
                  {String(quantity).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((value) => Math.min(9, value + 1))}
                  className="h-10 w-10 font-display text-xl text-bone-white hover:bg-bone-white hover:text-black"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={addToCart}
                className={`${styles.cta} group relative overflow-hidden border border-bone-white/25 px-5 py-4 text-left`}
              >
                <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil text-bone-white group-hover:text-black">
                  {cartSignal}
                </span>
                <span className="relative z-10 float-right font-display text-xl text-blood-accent">+</span>
              </button>
              <button
                type="button"
                onClick={buyNow}
                className={`${styles.ctaBlood} clip-cut group relative overflow-hidden bg-blood-accent px-5 py-4 text-left`}
              >
                <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil text-bone-white group-hover:text-black">
                  BUY NOW
                </span>
                <span className="relative z-10 float-right font-display text-xl">→</span>
              </button>
            </div>

            <div className="mt-8">
              <p className="font-stencil text-[0.5rem] tracking-stencil text-blood-accent">FILE NOTES</p>
              <ul className="mt-4 border-t border-bone-white/15">
                {product.details.map((detail, index) => (
                  <li key={detail} className="flex gap-4 border-b border-bone-white/15 py-3">
                    <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-body text-[0.95rem] uppercase tracking-[0.08em] text-bone-white/75">
                      {detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="relative border-b border-bone-white/15 bg-off-black px-gutter py-[11vh]">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">SAME FILE / OTHER EVIDENCE</p>
              <h2 className="mt-3 font-blackletter text-[clamp(2.8rem,6vw,6rem)] leading-[0.85]">OTHER RECORDS</h2>
            </div>
            <Link href="/products" className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray hover:text-bone-white">
              OPEN COMPLETE ARCHIVE →
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {related.map((entry) => (
              <Link
                key={entry.id}
                href={`/products/${entry.id}`}
                className={`${styles.related} group relative overflow-hidden border border-bone-white/15 bg-black p-2`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                  <Image src={entry.still} alt={entry.alt} fill sizes="(max-width: 768px) 92vw, 30vw" className="media-product object-cover transition-transform duration-700 ease-hard group-hover:scale-[1.035]" />
                  <span className={`${styles.vignette} absolute inset-0`} />
                </div>
                <div className="flex items-end justify-between gap-4 px-2 pb-2 pt-4">
                  <div>
                    <span className="font-stencil text-[0.45rem] tracking-stencil text-blood-accent">FILE {entry.index}</span>
                    <h3 className="mt-1 font-display text-[clamp(1.6rem,3vw,3rem)] leading-[0.85] tracking-crushed">{entry.name}</h3>
                  </div>
                  <span className="font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">{entry.price}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="relative overflow-hidden px-gutter py-[11vh]">
        <p className="font-stencil text-[0.5rem] tracking-stencil text-blood-accent">PRODUCT FILE / END</p>
        <div className="mt-5 flex flex-col justify-between gap-8 border-t border-bone-white/15 pt-7 lg:flex-row lg:items-end">
          <p className="max-w-[11ch] font-display text-[clamp(3.5rem,9vw,9rem)] leading-[0.78] tracking-crushed">
            WE DON'T HOLD IT FOREVER.
          </p>
          <Link href="/cart" className={`${styles.cartLink} clip-cut group relative min-w-[15rem] overflow-hidden border border-bone-white/20 px-5 py-4`}>
            <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil group-hover:text-black">OPEN CART / HOLDING CELL</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
