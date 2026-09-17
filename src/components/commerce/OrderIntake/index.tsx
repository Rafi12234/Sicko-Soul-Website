"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { findProductById } from "@/data/products";
import { useCartStore } from "@/store/useCartStore";
import styles from "./OrderIntake.module.css";

type OrderIntakeProps = {
  source?: string;
  productId?: string;
  size?: string;
  quantity?: number;
};

type OrderLine = {
  key: string;
  productId: string;
  size: string;
  quantity: number;
};

const money = (value: number) => `৳ ${value.toLocaleString("en-US")}`;

export default function OrderIntake({ source, productId, size, quantity = 1 }: OrderIntakeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cartItems = useCartStore((state) => state.items);
  const [reference, setReference] = useState<string | null>(null);

  const rawLines: OrderLine[] = useMemo(() => {
    if (source === "cart") return cartItems;
    if (!productId) return [];
    const lookup = findProductById(productId);
    if (!lookup) return [];
    const selectedSize = lookup.product.sizes.includes(size ?? "") ? (size as string) : lookup.product.defaultSize;
    return [
      {
        key: `${productId}::${selectedSize}`,
        productId,
        size: selectedSize,
        quantity: Math.max(1, Math.min(9, quantity)),
      },
    ];
  }, [cartItems, productId, quantity, size, source]);

  const lines = useMemo(
    () =>
      rawLines.flatMap((item) => {
        const lookup = findProductById(item.productId);
        return lookup ? [{ item, ...lookup }] : [];
      }),
    [rawLines],
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
      const split = new SplitText(".order-title", { type: "chars" });
      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".order-kicker", { y: 16, autoAlpha: 0, duration: 0.5 })
        .from(split.chars, { yPercent: 120, autoAlpha: 0, stagger: 0.025, duration: 0.95 }, "-=0.2")
        .from(".order-step", { y: 28, autoAlpha: 0, stagger: 0.08, duration: 0.72 }, "-=0.6")
        .from(".order-summary", { x: 35, autoAlpha: 0, duration: 0.8 }, "-=0.65");
      return () => split.revert();
    }, root);

    return () => ctx.revert();
  }, [lines.length]);

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextReference = `SS-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    setReference(nextReference);
    requestAnimationFrame(() => {
      gsap.fromTo(
        ".order-confirmation",
        { clipPath: "inset(0 0 100% 0)", autoAlpha: 0 },
        { clipPath: "inset(0 0 0% 0)", autoAlpha: 1, duration: 0.9, ease: EASE.inOut },
      );
    });
  };

  if (lines.length === 0) {
    return (
      <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black px-gutter pb-[12vh] pt-32 text-bone-white">
        <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <div className="order-kicker relative z-10 flex items-center gap-4 border-b border-bone-white/15 pb-4">
          <span className="h-px w-10 bg-blood-accent" />
          <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">ORDER INTAKE / NO FILE</span>
        </div>
        <div className="relative z-10 flex min-h-[68vh] flex-col justify-end py-[8vh]">
          <div className="split-mask pb-4">
            <h1 className="order-title text-distress max-w-[8ch] font-display text-[clamp(5rem,14vw,14rem)] leading-[0.72] tracking-crushed">NOTHING TO TAKE</h1>
          </div>
          <p className="mt-5 max-w-[32ch] font-blackletter text-[clamp(1.8rem,4vw,3.8rem)] leading-[0.95] text-concrete-gray">Open a product file or move something through the holding cell first.</p>
          <Link href="/products" className={`${styles.primaryCta} clip-cut group relative mt-10 inline-flex w-fit min-w-[16rem] items-center justify-between overflow-hidden bg-blood-accent px-5 py-4`}>
            <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil group-hover:text-black">OPEN PRODUCT ARCHIVE</span>
            <span className="relative z-10 font-display text-xl group-hover:text-black">→</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black text-bone-white">
      <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-x-0 top-0 h-screen`} />
      <span aria-hidden className={`${styles.number} pointer-events-none absolute right-[-0.02em] top-[11vh] font-display text-outline-2`}>03</span>

      <header className="relative z-10 px-gutter pb-[7vh] pt-32">
        <div className="order-kicker flex flex-wrap items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
          <div className="flex items-center gap-4">
            <span className="h-px w-10 bg-blood-accent" />
            <span className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">ORDER INTAKE / MANUAL CONFIRMATION</span>
          </div>
          <span className="font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">NO ONLINE PAYMENT COLLECTED HERE</span>
        </div>
        <div className="mt-[7vh]">
          <p className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">STEP 03 / GIVE US ENOUGH TO FIND YOU</p>
          <div className="split-mask mt-4 pb-4">
            <h1 className="order-title text-distress font-display text-[clamp(4.8rem,12vw,12rem)] leading-[0.72] tracking-crushed">TAKE THE ORDER</h1>
          </div>
        </div>
      </header>

      <section className="relative z-10 grid gap-10 px-gutter pb-[13vh] xl:grid-cols-12 xl:gap-x-[5vw]">
        <form onSubmit={submitOrder} className="xl:col-span-7">
          <section className="order-step border-t border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-blackletter text-[clamp(2rem,4vw,4rem)] leading-[0.9]">Who are we calling?</h2>
              <span className="font-stencil text-[0.46rem] tracking-stencil text-blood-accent">01 / IDENTITY</span>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">FULL NAME *</span>
                <input required name="name" autoComplete="name" className={styles.input} placeholder="THE NAME ON THE ORDER" />
              </label>
              <label className="block">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">PHONE *</span>
                <input required name="phone" autoComplete="tel" inputMode="tel" className={styles.input} placeholder="01XXXXXXXXX" />
              </label>
              <label className="block md:col-span-2">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">EMAIL / OPTIONAL</span>
                <input name="email" autoComplete="email" inputMode="email" className={styles.input} placeholder="WHERE THE PAPER TRAIL CAN FIND YOU" />
              </label>
            </div>
          </section>

          <section className="order-step border-t border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-blackletter text-[clamp(2rem,4vw,4rem)] leading-[0.9]">Where does it go?</h2>
              <span className="font-stencil text-[0.46rem] tracking-stencil text-blood-accent">02 / DROP POINT</span>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">FULL DELIVERY ADDRESS *</span>
                <textarea required name="address" autoComplete="street-address" rows={4} className={`${styles.input} resize-none`} placeholder="HOUSE / ROAD / AREA / LANDMARK" />
              </label>
              <label className="block">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">AREA / CITY *</span>
                <input required name="city" autoComplete="address-level2" className={styles.input} placeholder="YOUR AREA OR CITY" />
              </label>
              <label className="block">
                <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">DISTRICT *</span>
                <input required name="district" autoComplete="address-level1" className={styles.input} placeholder="DISTRICT" />
              </label>
            </div>
          </section>

          <section className="order-step border-y border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-blackletter text-[clamp(2rem,4vw,4rem)] leading-[0.9]">Anything we should know?</h2>
              <span className="font-stencil text-[0.46rem] tracking-stencil text-blood-accent">03 / NOTES</span>
            </div>
            <label className="mt-7 block">
              <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">ORDER NOTE / OPTIONAL</span>
              <textarea name="note" rows={4} className={`${styles.input} resize-none`} placeholder="SIZE NOTE / DELIVERY INSTRUCTION / SOMETHING ELSE" />
            </label>

            <div className={`${styles.paymentStrip} mt-6 border border-bone-white/15 p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="font-stencil text-[0.46rem] tracking-stencil text-blood-accent">PAYMENT METHOD</p>
                  <p className="mt-2 font-display text-2xl tracking-crushed">CASH / MANUAL CONFIRMATION</p>
                </div>
                <span className="font-stencil text-[0.44rem] leading-[1.7] tracking-stencil text-concrete-gray">NO CARD DATA<br />NO GATEWAY</span>
              </div>
            </div>
          </section>

          <button type="submit" className={`${styles.primaryCta} clip-cut group relative mt-7 flex w-full items-center justify-between overflow-hidden bg-blood-accent px-6 py-5 text-left`}>
            <span className="relative z-10 font-stencil text-[0.58rem] tracking-stencil group-hover:text-black">SEAL ORDER REQUEST</span>
            <span className="relative z-10 font-display text-2xl group-hover:text-black">→</span>
          </button>
          <p className="mt-3 font-stencil text-[0.42rem] leading-[1.7] tracking-stencil text-concrete-gray">
            FRONTEND DEMO STATE — CONNECT THIS FORM TO YOUR ORDER BACKEND / EMAIL / DATABASE BEFORE LAUNCH.
          </p>

          {reference && (
            <div className="order-confirmation mt-8 border-l-2 border-blood-accent bg-off-black p-6 opacity-0">
              <p className="font-stencil text-[0.48rem] tracking-stencil text-blood-accent">ORDER DRAFT SEALED</p>
              <p className="mt-3 font-display text-[clamp(2.4rem,5vw,5rem)] leading-[0.8] tracking-crushed">{reference}</p>
              <p className="mt-4 max-w-[42ch] font-body text-body-lg text-bone-white/60">
                The interface is complete. In this frontend-only build no order leaves the browser yet; connect the submit handler when the backend phase begins.
              </p>
            </div>
          )}
        </form>

        <aside className={`${styles.summary} order-summary h-fit border border-bone-white/15 bg-off-black p-6 xl:sticky xl:top-28 xl:col-span-5`}>
          <div className="flex items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
            <span className="font-stencil text-[0.5rem] tracking-stencil text-blood-accent">ORDER CONTENTS</span>
            <span className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">{String(itemCount).padStart(2, "0")} UNITS</span>
          </div>

          <div>
            {lines.map(({ item, product, category }) => (
              <div key={item.key} className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-bone-white/15 py-5">
                <div className="theme-light relative aspect-[4/5] overflow-hidden bg-black p-1 shadow-print">
                  <div className="relative h-full w-full overflow-hidden bg-off-black">
                    <Image src={product.still} alt={product.alt} fill sizes="6rem" className="media-product object-cover" />
                  </div>
                </div>
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="font-stencil text-[0.42rem] tracking-stencil text-blood-accent">{category.name} / {product.index}</span>
                    <p className="mt-1 font-display text-[1.8rem] leading-[0.85] tracking-crushed">{product.name}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <span className="font-stencil text-[0.42rem] leading-[1.7] tracking-stencil text-concrete-gray">SIZE {item.size}<br />QTY {String(item.quantity).padStart(2, "0")}</span>
                    <span className="font-body text-base font-semibold">{money(product.priceValue * item.quantity)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <dl className="mt-5 border-y border-bone-white/15">
            <div className="flex items-center justify-between gap-5 border-b border-bone-white/15 py-4">
              <dt className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">PRODUCT TOTAL</dt>
              <dd className="font-body text-xl font-semibold">{money(subtotal)}</dd>
            </div>
            <div className="flex items-start justify-between gap-5 py-4">
              <dt className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray">DELIVERY CHARGE</dt>
              <dd className="max-w-[17ch] text-right font-stencil text-[0.43rem] leading-[1.7] tracking-stencil text-concrete-gray">CONFIRMED MANUALLY WITH THE ORDER</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap justify-between gap-4">
            <Link href={source === "cart" ? "/cart" : `/products/${productId}`} className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray hover:text-bone-white">← CHANGE ORDER</Link>
            <Link href="/products" className="font-stencil text-[0.46rem] tracking-stencil text-concrete-gray hover:text-bone-white">ARCHIVE ↗</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
