"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { findProductById, getProductVariants, getVariantBySize } from "@/data/products";
import { createIdempotencyKey, money } from "@/lib/commerce";
import { createOrder } from "@/lib/customerApi";
import { useCartStore } from "@/store/useCartStore";
import type { CreateOrderRequest, PaymentMethod } from "@/types/commerce";
import SickoButton from "@/components/ui/SickoButton";
import styles from "./OrderIntake.module.css";

type OrderIntakeProps = {
  source?: string;
  productId?: string;
  size?: string;
  quantity?: number;
};

export default function OrderIntake({ source, productId, size, quantity = 1 }: OrderIntakeProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const cartItems = useCartStore((state) => state.items);
  const cartToken = useCartStore((state) => state.cartToken);
  const markConverted = useCartStore((state) => state.markConverted);
  const isCart = source === "cart";

  const lines = useMemo(() => {
    if (isCart) {
      return cartItems.flatMap((item) => {
        const lookup = findProductById(item.productId);
        if (!lookup) return [];
        const variant =
          getProductVariants(lookup.product).find((entry) => entry.id === item.variantId) ??
          getVariantBySize(lookup.product, item.size);
        if (!variant) return [];
        return [{ product: lookup.product, category: lookup.category, variant, quantity: item.quantity }];
      });
    }

    if (!productId) return [];
    const lookup = findProductById(productId);
    if (!lookup) return [];
    const variant = getVariantBySize(lookup.product, size ?? lookup.product.defaultSize);
    if (!variant) return [];

    return [
      {
        product: lookup.product,
        category: lookup.category,
        variant,
        quantity: Math.max(1, Math.min(variant.availableQty, quantity)),
      },
    ];
  }, [cartItems, isCart, productId, quantity, size]);

  const subtotal = lines.reduce((sum, line) => sum + line.variant.price * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const split = new SplitText(".order-title", { type: "chars" });
      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".order-kicker", { y: 15, autoAlpha: 0, duration: 0.5 })
        .from(
          split.chars,
          { yPercent: 120, autoAlpha: 0, duration: 0.85, stagger: 0.02 },
          "-=0.2",
        )
        .from(
          ".order-step",
          { y: 30, autoAlpha: 0, stagger: 0.08, duration: 0.65 },
          "-=0.45",
        )
        .from(".order-summary", { x: 30, autoAlpha: 0, duration: 0.75 }, "-=0.5");
      return () => split.revert();
    }, root);

    return () => ctx.revert();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lines.length === 0 || submitting) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const city = String(form.get("city") ?? "").trim();
    const district = String(form.get("district") ?? "").trim();
    const postalCode = String(form.get("postalCode") ?? "").trim();
    const landmark = String(form.get("landmark") ?? "").trim();
    const note = String(form.get("note") ?? "").trim();

    if (!name || !phone || !email || !address || !city || !district) {
      setError("REQUIRED FIELDS ARE MISSING.");
      return;
    }

    const payload: CreateOrderRequest = {
      idempotencyKey: createIdempotencyKey(),
      source: isCart ? "CART" : "BUY_NOW",
      cartToken: isCart ? cartToken : null,
      customer: { name, phone, email },
      shipping: {
        address,
        city,
        district,
        postalCode: postalCode || undefined,
        landmark: landmark || undefined,
      },
      note: note || undefined,
      paymentMethod,
      items: lines.map((line) => ({
        productId: line.product.id,
        variantId: line.variant.id,
        quantity: line.quantity,
      })),
    };

    setSubmitting(true);
    setError("");

    try {
      const order = await createOrder(payload);
      if (isCart) markConverted();
      router.push(`/order-confirmation/${encodeURIComponent(order.reference)}`);
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : "ORDER COULD NOT BE SEALED.");
      setSubmitting(false);
    }
  }

  if (lines.length === 0) {
    return (
      <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black px-gutter pb-24 pt-36 text-bone-white">
        <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <span className="font-body text-xs font-semibold uppercase tracking-[0.2em] text-blood-accent">ORDER INTAKE / EMPTY</span>
        <h1 className="mt-5 max-w-[8ch] font-display text-[clamp(4rem,10vw,10rem)] leading-[0.78] tracking-crushed">NOTHING<br />TO PROCESS</h1>
        <p className="mt-6 max-w-[36ch] font-body text-lg leading-relaxed text-bone-white/55">Open a garment file or move something through the holding cell first.</p>
        <div className="mt-10 max-w-sm">
          <SickoButton href="/products" tone="blood" full>OPEN ARCHIVE</SickoButton>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative min-h-screen overflow-hidden bg-black px-gutter pb-24 pt-32 text-bone-white">
      <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
      <span aria-hidden className={`${styles.number} pointer-events-none absolute right-[-4vw] top-[16vh] font-display text-outline-2`}>04</span>

      <header className="relative z-10 mx-auto max-w-[1500px] border-b border-bone-white/15 pb-10">
        <div className="order-kicker flex items-center gap-4">
          <span className="h-px w-12 bg-blood-accent" />
          <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blood-accent">ORDER INTAKE / NO ACCOUNTS / NO NOISE</span>
        </div>
        <div className="split-mask mt-8">
          <h1 className="order-title font-display text-[clamp(4.5rem,11vw,11rem)] leading-[0.75] tracking-crushed">TAKE<br />THE ORDER</h1>
        </div>
      </header>

      <section className="relative z-10 mx-auto mt-12 grid max-w-[1500px] gap-12 xl:grid-cols-12">
        <form onSubmit={handleSubmit} className="xl:col-span-7">
          <section className="order-step pb-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] leading-[0.85] tracking-crushed">WHO GETS THE FILE?</h2>
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">01 / IDENTITY</span>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label><span className={styles.label}>FULL NAME *</span><input required name="name" autoComplete="name" className={styles.input} placeholder="NAME ON THE DELIVERY" /></label>
              <label><span className={styles.label}>PHONE *</span><input required name="phone" autoComplete="tel" inputMode="tel" className={styles.input} placeholder="01XXXXXXXXX" /></label>
              <label className="md:col-span-2"><span className={styles.label}>EMAIL *</span><input required type="email" name="email" autoComplete="email" inputMode="email" className={styles.input} placeholder="ORDER CONFIRMATION GOES HERE" /></label>
            </div>
          </section>

          <section className="order-step border-t border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] leading-[0.85] tracking-crushed">WHERE DOES IT GO?</h2>
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">02 / DROP POINT</span>
            </div>
            <div className="mt-7 grid gap-5 md:grid-cols-2">
              <label className="md:col-span-2"><span className={styles.label}>FULL DELIVERY ADDRESS *</span><textarea required name="address" autoComplete="street-address" rows={4} className={`${styles.input} resize-none`} placeholder="HOUSE / ROAD / AREA" /></label>
              <label><span className={styles.label}>AREA / CITY *</span><input required name="city" autoComplete="address-level2" className={styles.input} placeholder="AREA OR CITY" /></label>
              <label><span className={styles.label}>DISTRICT *</span><input required name="district" autoComplete="address-level1" className={styles.input} placeholder="DISTRICT" /></label>
              <label><span className={styles.label}>POSTAL CODE / OPTIONAL</span><input name="postalCode" autoComplete="postal-code" className={styles.input} placeholder="POSTAL CODE" /></label>
              <label><span className={styles.label}>LANDMARK / OPTIONAL</span><input name="landmark" className={styles.input} placeholder="NEARBY LANDMARK" /></label>
            </div>
          </section>

          <section className="order-step border-t border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] leading-[0.85] tracking-crushed">PAYMENT</h2>
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">03 / METHOD</span>
            </div>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {([[
                "COD",
                "CASH ON DELIVERY",
              ], ["MANUAL", "MANUAL CONFIRMATION"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentMethod(value)}
                  className={`border px-5 py-5 text-left transition-colors ${paymentMethod === value ? "border-blood-accent bg-blood-accent text-paper" : "border-bone-white/20 text-bone-white hover:border-bone-white/60"}`}
                >
                  <span className="block font-body text-[0.78rem] font-semibold uppercase tracking-[0.16em]">{label}</span>
                  <span className="mt-2 block font-body text-sm text-current opacity-60">{value === "COD" ? "PAY WHEN THE ORDER ARRIVES." : "SICKO SOUL CONFIRMS PAYMENT OUTSIDE THE SITE."}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="order-step border-y border-bone-white/15 py-7">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="font-display text-[clamp(2.8rem,5vw,5rem)] leading-[0.85] tracking-crushed">LAST WORD?</h2>
              <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">04 / NOTES</span>
            </div>
            <label className="mt-7 block"><span className={styles.label}>ORDER NOTE / OPTIONAL</span><textarea name="note" rows={4} className={`${styles.input} resize-none`} placeholder="DELIVERY INSTRUCTION / SIZE NOTE / SOMETHING ELSE" /></label>
          </section>

          {error && <div className="mt-5 border-l-2 border-blood-accent bg-blood-accent/10 px-5 py-4 font-body text-[0.8rem] font-semibold uppercase tracking-[0.12em] text-bone-white">{error}</div>}

          <div className="mt-7">
            <SickoButton type="submit" tone="blood" full disabled={submitting}>{submitting ? "SEALING ORDER..." : "SEAL ORDER REQUEST"}</SickoButton>
          </div>
          <p className="mt-4 max-w-[55ch] font-body text-sm leading-relaxed text-concrete-gray">Prices and stock are validated again by the server before an order is accepted.</p>
        </form>

        <aside className={`${styles.summary} order-summary h-fit border border-bone-white/15 bg-off-black p-6 xl:sticky xl:top-28 xl:col-span-5`}>
          <div className="flex items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
            <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">ORDER CONTENTS</span>
            <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-concrete-gray">{String(itemCount).padStart(2, "0")} UNITS</span>
          </div>

          {lines.map((line) => (
            <div key={line.variant.id} className="grid grid-cols-[5.5rem_1fr] gap-4 border-b border-bone-white/15 py-5">
              <div className="theme-light relative aspect-[4/5] overflow-hidden bg-black p-1 shadow-print">
                <div className="relative h-full w-full overflow-hidden bg-off-black">
                  <Image src={line.product.still} alt={line.product.alt} fill sizes="6rem" className="media-product object-cover" />
                </div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <span className="font-body text-[0.66rem] font-semibold uppercase tracking-[0.16em] text-blood-accent">{line.category.name} / {line.product.index}</span>
                  <p className="mt-1 font-display text-[1.8rem] leading-[0.85] tracking-crushed">{line.product.name}</p>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="font-body text-[0.68rem] font-semibold uppercase leading-[1.65] tracking-[0.13em] text-concrete-gray">SIZE {line.variant.size}<br />QTY {String(line.quantity).padStart(2, "0")}</span>
                  <span className="font-body text-base font-semibold">{money(line.variant.price * line.quantity)}</span>
                </div>
              </div>
            </div>
          ))}

          <dl className="mt-5 border-y border-bone-white/15">
            <div className="flex items-center justify-between gap-5 border-b border-bone-white/15 py-4"><dt className={styles.label}>PRODUCT TOTAL</dt><dd className="font-body text-xl font-semibold">{money(subtotal)}</dd></div>
            <div className="flex items-start justify-between gap-5 py-4"><dt className={styles.label}>DELIVERY</dt><dd className="max-w-[19ch] text-right font-body text-sm font-semibold uppercase tracking-[0.1em] text-concrete-gray">SERVER CONFIRMS FINAL DELIVERY CHARGE</dd></div>
          </dl>

          <div className="mt-6 flex flex-wrap justify-between gap-4">
            <Link href={isCart ? "/cart" : `/products/${productId}`} className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-concrete-gray hover:text-bone-white">← CHANGE ORDER</Link>
            <Link href="/products" className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-concrete-gray hover:text-bone-white">ARCHIVE ↗</Link>
          </div>
        </aside>
      </section>
    </div>
  );
}
