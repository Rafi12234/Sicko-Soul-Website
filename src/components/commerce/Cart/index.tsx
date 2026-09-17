"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { findProductById } from "@/data/products";
import { useCartStore } from "@/store/useCartStore";
import styles from "./Cart.module.css";

const money = (value: number) => `৳ ${value.toLocaleString("en-US")}`;

export default function Cart() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const setSize = useCartStore((state) => state.setSize);
  const clearCart = useCartStore((state) => state.clearCart);

  const lines = useMemo(
    () =>
      items.flatMap((item) => {
        const lookup = findProductById(item.productId);
        return lookup ? [{ item, ...lookup }] : [];
      }),
    [items],
  );

  const itemCount = lines.reduce((sum, line) => sum + line.item.quantity, 0);
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.priceValue * line.item.quantity,
    0,
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(".cart-title", { type: "chars" });
      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".cart-kicker", { y: 16, autoAlpha: 0, duration: 0.5 })
        .from(split.chars, { yPercent: 120, autoAlpha: 0, stagger: 0.03, duration: 0.95 }, "-=0.2")
        .from(".cart-rule", { scaleX: 0, transformOrigin: "left", duration: 0.8 }, "-=0.6")
        .from(".cart-line", { y: 40, autoAlpha: 0, stagger: 0.08, duration: 0.75 }, "-=0.45")
        .from(".cart-summary", { x: 32, autoAlpha: 0, duration: 0.75 }, "-=0.7");
      return () => split.revert();
    }, root);

    return () => ctx.revert();
  }, [lines.length]);

  if (lines.length === 0) {
    return (
      <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black px-gutter pb-[12vh] pt-32 text-bone-white">
        <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <div className="cart-kicker relative z-10 flex items-center gap-4 border-b border-bone-white/15 pb-4">
          <span className="h-px w-10 bg-blood-accent" />
          <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">CART / HOLDING CELL</span>
        </div>
        <div className="relative z-10 flex min-h-[68vh] flex-col justify-end py-[8vh]">
          <span aria-hidden className="pointer-events-none absolute right-0 top-[7vh] font-display text-[44vw] leading-[0.7] text-outline-2 opacity-[0.12]">0</span>
          <div className="split-mask pb-4">
            <h1 className="cart-title text-distress max-w-[8ch] font-display text-[clamp(5rem,14vw,14rem)] leading-[0.72] tracking-crushed">NO EVIDENCE</h1>
          </div>
          <p className="mt-5 max-w-[35ch] font-blackletter text-[clamp(1.8rem,4vw,3.8rem)] leading-[0.95] text-concrete-gray">
            Nothing is being held for you.
          </p>
          <Link href="/products" className={`${styles.primaryCta} clip-cut group relative mt-10 inline-flex w-fit min-w-[16rem] items-center justify-between overflow-hidden bg-blood-accent px-5 py-4`}>
            <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil group-hover:text-black">RETURN TO THE ARCHIVE</span>
            <span className="relative z-10 font-display text-xl">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black text-bone-white">
      <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-x-0 top-0 h-[90vh]`} />

      <header className="relative z-10 px-gutter pb-[8vh] pt-32">
        <div className="cart-kicker flex flex-wrap items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-blood-accent" />
            <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">CART / HOLDING CELL</span>
          </div>
          <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
            {String(itemCount).padStart(2, "0")} UNIT{itemCount === 1 ? "" : "S"} DETAINED
          </span>
        </div>

        <div className="mt-[7vh] flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div className="split-mask pb-4">
            <h1 className="cart-title text-distress font-display text-[clamp(5rem,13vw,13rem)] leading-[0.72] tracking-crushed">HOLDING CELL</h1>
          </div>
          <p className="max-w-[31ch] font-stencil text-[0.52rem] leading-[1.9] tracking-stencil text-concrete-gray lg:text-right">
            CHANGE THE SIZE. CHANGE THE COUNT. REMOVE THE RECORD. NOTHING IS FINAL UNTIL THE ORDER IS TAKEN.
          </p>
        </div>
        <span className="cart-rule mt-7 block h-px w-full bg-bone-white/15" />
      </header>

      <section className="relative z-10 grid gap-10 px-gutter pb-[12vh] xl:grid-cols-12 xl:gap-x-[5vw]">
        <div className="xl:col-span-8">
          {lines.map(({ item, product, category }, index) => (
            <article key={item.key} className={`${styles.line} cart-line grid gap-5 border-b border-bone-white/15 py-7 md:grid-cols-[11rem_1fr_auto] md:items-stretch`}>
              <Link href={`/products/${product.id}`} className={`${styles.thumb} theme-light relative block aspect-[4/5] overflow-hidden bg-black p-1.5 shadow-print`}>
                <div className="relative h-full w-full overflow-hidden bg-off-black">
                  <Image src={product.still} alt={product.alt} fill sizes="(max-width: 768px) 40vw, 11rem" className="media-product object-cover transition-transform duration-700 ease-hard hover:scale-[1.04]" />
                  <span className={`${styles.vignette} absolute inset-0`} />
                  <span className="absolute left-2 top-2 bg-black/70 px-1.5 py-1 font-stencil text-[0.4rem] tracking-stencil text-bone-white/70">{String(index + 1).padStart(2, "0")}</span>
                </div>
              </Link>

              <div className="flex flex-col justify-between py-1">
                <div>
                  <p className="font-stencil text-[0.47rem] tracking-stencil text-blood-accent">{category.name} / FILE {product.index}</p>
                  <Link href={`/products/${product.id}`} className="mt-2 block max-w-[10ch] font-display text-[clamp(2.4rem,5vw,5rem)] leading-[0.8] tracking-crushed text-bone-white hover:text-concrete-gray">
                    {product.name}
                  </Link>
                  <p className="mt-3 font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">{product.spec}</p>
                </div>

                <button type="button" onClick={() => removeItem(item.key)} className="mt-6 w-fit font-stencil text-[0.46rem] tracking-stencil text-concrete-gray underline decoration-blood-accent decoration-1 underline-offset-4 hover:text-blood-accent">
                  BURN THIS RECORD
                </button>
              </div>

              <div className="flex min-w-[12rem] flex-col justify-between gap-5 border-t border-bone-white/15 pt-5 md:border-l md:border-t-0 md:pl-5 md:pt-0">
                <div>
                  <label htmlFor={`size-${item.key}`} className="block font-stencil text-[0.44rem] tracking-stencil text-concrete-gray">SIZE</label>
                  <select
                    id={`size-${item.key}`}
                    value={item.size}
                    onChange={(event) => setSize(item.key, event.target.value)}
                    className={`${styles.select} mt-2 w-full border border-bone-white/20 bg-black px-3 py-2 font-stencil text-[0.52rem] tracking-stencil text-bone-white`}
                  >
                    {product.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </div>

                <div>
                  <span className="block font-stencil text-[0.44rem] tracking-stencil text-concrete-gray">QUANTITY</span>
                  <div className="mt-2 flex w-full items-center border border-bone-white/20">
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity - 1)} className="h-9 flex-1 font-display text-lg hover:bg-bone-white hover:text-black" aria-label={`Decrease ${product.name} quantity`}>−</button>
                    <span className="flex h-9 min-w-10 items-center justify-center border-x border-bone-white/20 font-stencil text-[0.5rem] tracking-stencil">{String(item.quantity).padStart(2, "0")}</span>
                    <button type="button" onClick={() => setQuantity(item.key, item.quantity + 1)} className="h-9 flex-1 font-display text-lg hover:bg-bone-white hover:text-black" aria-label={`Increase ${product.name} quantity`}>+</button>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4 border-t border-bone-white/15 pt-4">
                  <span className="font-stencil text-[0.43rem] tracking-stencil text-concrete-gray">LINE TOTAL</span>
                  <span className="font-body text-lg font-semibold">{money(product.priceValue * item.quantity)}</span>
                </div>
              </div>
            </article>
          ))}

          <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
            <Link href="/products" className="font-stencil text-[0.48rem] tracking-stencil text-concrete-gray hover:text-bone-white">← ADD MORE EVIDENCE</Link>
            <button type="button" onClick={clearCart} className="font-stencil text-[0.48rem] tracking-stencil text-concrete-gray hover:text-blood-accent">CLEAR THE CELL</button>
          </div>
        </div>

        <aside className={`${styles.summary} cart-summary h-fit border border-bone-white/15 bg-off-black p-6 xl:sticky xl:top-28 xl:col-span-4`}>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-blood-accent" />
            <span className="font-stencil text-[0.5rem] tracking-stencil text-blood-accent">ORDER FILE / PREVIEW</span>
          </div>
          <h2 className="mt-5 font-blackletter text-[clamp(2.6rem,4vw,4.5rem)] leading-[0.88]">Before the call is made.</h2>

          <dl className="mt-8 border-y border-bone-white/15">
            <div className="flex items-center justify-between gap-5 border-b border-bone-white/15 py-4">
              <dt className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">UNITS</dt>
              <dd className="font-stencil text-[0.55rem] tracking-stencil">{String(itemCount).padStart(2, "0")}</dd>
            </div>
            <div className="flex items-center justify-between gap-5 border-b border-bone-white/15 py-4">
              <dt className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">PRODUCT TOTAL</dt>
              <dd className="font-body text-xl font-semibold">{money(subtotal)}</dd>
            </div>
            <div className="flex items-start justify-between gap-5 py-4">
              <dt className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">DELIVERY</dt>
              <dd className="max-w-[15ch] text-right font-stencil text-[0.45rem] leading-[1.7] tracking-stencil text-concrete-gray">CONFIRMED WITH THE ORDER</dd>
            </div>
          </dl>

          <p className="mt-6 font-body text-[0.95rem] leading-[1.6] text-bone-white/55">
            No payment gateway here. The next screen only takes the order details and prepares the request for manual confirmation.
          </p>

          <button type="button" onClick={() => router.push("/buy-now?source=cart")} className={`${styles.primaryCta} clip-cut group relative mt-7 flex w-full items-center justify-between overflow-hidden bg-blood-accent px-5 py-4 text-left`}>
            <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil group-hover:text-black">TAKE THIS ORDER</span>
            <span className="relative z-10 font-display text-xl group-hover:text-black">→</span>
          </button>
        </aside>
      </section>
    </div>
  );
}
