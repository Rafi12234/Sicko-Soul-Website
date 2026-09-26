"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { gsap, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import {
  getProductGallery,
  getProductVariants,
  type ArchiveCategory,
  type ArchiveProduct,
} from "@/data/products";
import { listReviews, submitReview } from "@/lib/customerApi";
import { money } from "@/lib/commerce";
import { useCartStore } from "@/store/useCartStore";
import type { ProductReview } from "@/types/commerce";
import SickoButton from "@/components/ui/SickoButton";
import styles from "./ProductDetail.module.css";

type ProductDetailProps = {
  product: ArchiveProduct;
  category: ArchiveCategory;
};

export default function ProductDetail({ product, category }: ProductDetailProps) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const gallery = useMemo(() => getProductGallery(product), [product]);
  const variants = useMemo(() => getProductVariants(product), [product]);

  const defaultVariant =
    variants.find(
      (variant) => variant.isDefault && variant.status === "ACTIVE" && variant.availableQty > 0,
    ) ??
    variants.find((variant) => variant.status === "ACTIVE" && variant.availableQty > 0) ??
    variants[0];

  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cartSignal, setCartSignal] = useState("ADD TO HOLDING CELL");
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewSignal, setReviewSignal] = useState("");
  const addItem = useCartStore((state) => state.addItem);

  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? null;
  const activeImage = gallery[activeImageIndex] ?? gallery[0];
  const soldOut =
    !selectedVariant || selectedVariant.status !== "ACTIVE" || selectedVariant.availableQty <= 0;
  const unitPrice = selectedVariant?.price ?? product.priceValue;

  useEffect(() => {
    let alive = true;
    listReviews(product.id).then((next) => {
      if (alive) setReviews(next);
    });
    return () => {
      alive = false;
    };
  }, [product.id]);

  useEffect(() => {
    setQuantity((current) =>
      Math.max(1, Math.min(current, Math.max(1, selectedVariant?.availableQty ?? 1))),
    );
  }, [selectedVariant]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const titleSplit = new SplitText(".detail-title", { type: "chars" });
      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".detail-kicker", { y: 18, autoAlpha: 0, duration: 0.55 })
        .from(
          titleSplit.chars,
          { yPercent: 120, rotate: 5, autoAlpha: 0, duration: 0.95, stagger: 0.025 },
          "-=0.2",
        )
        .from(
          ".detail-viewer",
          { clipPath: "inset(0 0 100% 0)", duration: 1 },
          "-=0.72",
        )
        .from(
          ".detail-panel > *",
          { y: 24, autoAlpha: 0, duration: 0.65, stagger: 0.055 },
          "-=0.7",
        );

      return () => titleSplit.revert();
    }, root);

    return () => ctx.revert();
  }, [product.id]);

  function changeImage(index: number) {
    if (index === activeImageIndex || !viewerRef.current) return;
    gsap
      .timeline()
      .to(viewerRef.current, { x: 15, autoAlpha: 0.25, duration: 0.18, ease: EASE.inOut })
      .add(() => setActiveImageIndex(index))
      .fromTo(
        viewerRef.current,
        { x: -15, autoAlpha: 0.25 },
        { x: 0, autoAlpha: 1, duration: 0.5, ease: EASE.expo },
      );
  }

  function handleAdd() {
    if (!selectedVariant || soldOut) return;
    addItem(product.id, selectedVariant.size, quantity);
    setCartSignal(`FILED / +${quantity}`);
    window.setTimeout(() => setCartSignal("ADD TO HOLDING CELL"), 1300);
  }

  function handleBuyNow() {
    if (!selectedVariant || soldOut) return;
    router.push(
      `/buy-now?product=${encodeURIComponent(product.id)}&size=${encodeURIComponent(
        selectedVariant.size,
      )}&qty=${quantity}`,
    );
  }

  async function handleReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const displayName = String(form.get("displayName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const title = String(form.get("title") ?? "").trim();
    const text = String(form.get("text") ?? "").trim();
    const orderReference = String(form.get("orderReference") ?? "").trim();
    const rating = Number(form.get("rating") ?? 5);

    if (!displayName || !email || text.length < 10) {
      setReviewSignal("NAME, EMAIL AND A REAL REVIEW ARE REQUIRED.");
      return;
    }

    try {
      await submitReview({
        productId: product.id,
        displayName,
        email,
        rating,
        title: title || undefined,
        text,
        orderReference: orderReference || undefined,
      });
      setReviewSignal("TESTIMONY RECEIVED / PENDING CLEARANCE");
      formElement.reset();
    } catch (error) {
      setReviewSignal(error instanceof Error ? error.message : "TESTIMONY COULD NOT BE FILED.");
    }
  }

  const rating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  const related = category.products.filter((entry) => entry.id !== product.id).slice(0, 3);

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-black text-bone-white">
      <section className="relative min-h-screen border-b border-bone-white/15 px-gutter pb-[10vh] pt-32">
        <span aria-hidden className={`${styles.grid} pointer-events-none absolute inset-0`} />
        <span aria-hidden className={`${styles.fileNumber} text-distress pointer-events-none absolute font-display text-outline-2`}>
          {product.index}
        </span>

        <div className="relative z-10 mb-[8vh] flex flex-wrap items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
          <div className="detail-kicker flex items-center gap-3">
            <span className="h-px w-10 bg-blood-accent" />
            <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-blood-accent">
              PRODUCT FILE / {category.index}.{product.index}
            </span>
          </div>
          <Link href="/products" className="detail-kicker font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray transition-colors hover:text-bone-white">
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
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-concrete-gray">{category.name}</span>
              <span className="h-px flex-1 bg-bone-white/15" />
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">{product.spec}</span>
            </div>

            <div className={`${styles.viewerWrap} detail-viewer relative mt-8`}>
              <div ref={viewerRef} className={`${styles.viewer} theme-light relative w-[92%] bg-black p-2 shadow-print md:w-[82%]`}>
                <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                  <Image
                    key={activeImage.id}
                    src={activeImage.url}
                    alt={activeImage.alt}
                    fill
                    priority={activeImageIndex === 0}
                    sizes="(max-width: 768px) 92vw, 58vw"
                    className={`media-product object-cover ${activeImage.type === "WORN" ? "object-[50%_10%]" : ""}`}
                  />
                  <span aria-hidden className={`${styles.vignette} absolute inset-0`} />
                  <span className="absolute left-4 top-4 bg-black/75 px-3 py-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-bone-white">
                    FRAME / {activeImage.label ?? activeImage.type}
                  </span>
                  <span className={`${styles.scan} pointer-events-none absolute inset-x-0 top-[22%] h-px bg-blood-accent/70`} />
                </div>
              </div>

              <div className="mt-7 grid grid-cols-2 gap-2 md:absolute md:bottom-[-1.35rem] md:right-0 md:z-20 md:mt-0 md:flex md:max-w-[78%] md:flex-wrap md:justify-end">
                {gallery.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => changeImage(index)}
                    aria-pressed={activeImageIndex === index}
                    className={`${styles.frameButton} border px-4 py-3 font-body text-[0.72rem] font-semibold uppercase tracking-[0.15em] ${
                      activeImageIndex === index
                        ? "border-blood-accent bg-blood-accent text-paper"
                        : "border-bone-white/25 bg-black text-concrete-gray hover:border-bone-white/60 hover:text-bone-white"
                    }`}
                  >
                    {String(index + 1).padStart(2, "0")} / {image.label ?? image.type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="detail-panel self-end xl:col-span-5 xl:pb-[4vh]">
            <div className="flex items-center justify-between gap-4 border-b border-bone-white/15 pb-4">
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-concrete-gray">ASKING PRICE</span>
              <span className="font-body text-[1.45rem] font-semibold text-bone-white">{money(unitPrice)}</span>
            </div>

            <p className="mt-7 max-w-[15ch] font-display text-[clamp(2.6rem,5vw,4.8rem)] uppercase leading-[0.86] tracking-crushed text-bone-white">
              {product.line}
            </p>
            <p className="mt-6 max-w-[39ch] font-body text-body-lg text-bone-white/65">{product.description}</p>

            <div className="mt-8 border-y border-bone-white/15 py-6">
              <div className="flex items-center justify-between gap-5">
                <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-bone-white">SELECT SIZE</span>
                <span className="font-body text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">REQUIRED</span>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2">
                {variants.map((variant) => {
                  const unavailable = variant.status !== "ACTIVE" || variant.availableQty <= 0;
                  const selected = variant.id === selectedVariantId;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={unavailable}
                      onClick={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      className={`${styles.sizeButton} relative border px-3 py-4 font-body text-[0.82rem] font-semibold uppercase tracking-[0.1em] ${
                        selected
                          ? "border-blood-accent bg-blood-accent text-paper"
                          : unavailable
                            ? "border-bone-white/10 text-concrete-gray/35"
                            : "border-bone-white/25 text-bone-white hover:border-bone-white/70"
                      }`}
                    >
                      {variant.size}
                      {unavailable && <span className="absolute inset-x-1 top-1/2 h-px rotate-[-12deg] bg-blood-accent" />}
                    </button>
                  );
                })}
              </div>

              {selectedVariant && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="font-body text-[0.68rem] uppercase tracking-[0.17em] text-concrete-gray">SKU / {selectedVariant.sku}</span>
                  <span className={`font-body text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${selectedVariant.availableQty <= 3 ? "text-blood-accent" : "text-bone-white/60"}`}>
                    {selectedVariant.availableQty === 0
                      ? "SOLD OUT"
                      : selectedVariant.availableQty <= 3
                        ? `ONLY ${selectedVariant.availableQty} LEFT`
                        : `${selectedVariant.availableQty} AVAILABLE`}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-6 border-b border-bone-white/15 pb-6">
              <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-concrete-gray">QUANTITY</span>
              <div className="flex items-center border border-bone-white/20">
                <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="grid h-11 w-11 place-items-center font-body text-xl text-bone-white hover:bg-bone-white hover:text-ink" aria-label="Decrease quantity">−</button>
                <span className="grid h-11 min-w-12 place-items-center border-x border-bone-white/20 font-body text-base font-semibold">{String(quantity).padStart(2, "0")}</span>
                <button
                  type="button"
                  disabled={!selectedVariant || quantity >= selectedVariant.availableQty}
                  onClick={() => setQuantity(Math.min(selectedVariant?.availableQty ?? quantity, quantity + 1))}
                  className="grid h-11 w-11 place-items-center font-body text-xl text-bone-white hover:bg-bone-white hover:text-ink disabled:opacity-25"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <SickoButton type="button" tone="paper" full disabled={soldOut} onClick={handleAdd}>
                {soldOut ? "UNAVAILABLE" : cartSignal}
              </SickoButton>
              <SickoButton type="button" tone="blood" full disabled={soldOut} onClick={handleBuyNow}>
                TAKE THIS ORDER
              </SickoButton>
            </div>

            <div className="mt-8 border-t border-bone-white/15 pt-6">
              <p className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">GARMENT RECORD</p>
              <ul className="mt-4 space-y-2">
                {product.details.map((detail, index) => (
                  <li key={detail} className="flex gap-4 border-b border-bone-white/10 pb-2 font-body text-[0.92rem] text-bone-white/65">
                    <span className="text-blood-accent">{String(index + 1).padStart(2, "0")}</span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="border-b border-bone-white/15 px-gutter py-[10vh]">
        <div className="mx-auto max-w-[1500px]">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-blood-accent">PUBLIC TESTIMONY</span>
              <h2 className="mt-3 font-display text-[clamp(3.5rem,8vw,8rem)] leading-[0.8] tracking-crushed">STREET<br />RECORD</h2>
            </div>
            <div className="border-l border-blood-accent pl-5">
              <div className="font-display text-[clamp(3rem,6vw,6rem)] leading-none">{reviews.length ? rating.toFixed(1) : "—"}</div>
              <div className="mt-2 font-body text-[0.7rem] font-semibold uppercase tracking-[0.17em] text-concrete-gray">{reviews.length} CLEARED TESTIMONIES</div>
            </div>
          </div>

          <div className="mt-10 grid gap-10 xl:grid-cols-12">
            <div className="space-y-3 xl:col-span-7">
              {reviews.length === 0 && (
                <div className="border border-bone-white/15 p-6 font-body text-lg text-bone-white/50">NO TESTIMONY HAS BEEN CLEARED FOR THIS FILE.</div>
              )}
              {reviews.map((review) => (
                <article key={review.id} className="border border-bone-white/15 bg-off-black p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="font-body text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-blood-accent">{"★".repeat(review.rating)}</span>
                    {review.verifiedPurchase && <span className="border border-bone-white/20 px-2 py-1 font-body text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-bone-white/60">VERIFIED PURCHASE</span>}
                  </div>
                  {review.title && <h3 className="mt-5 font-display text-[2rem] leading-[0.9] tracking-crushed">{review.title}</h3>}
                  <p className="mt-4 max-w-[55ch] font-body text-[1.05rem] leading-[1.55] text-bone-white/65">“{review.text}”</p>
                  <p className="mt-5 font-body text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-concrete-gray">{review.displayName}</p>
                </article>
              ))}
            </div>

            <form onSubmit={handleReview} className="border-l-2 border-blood-accent bg-off-black p-6 xl:col-span-5">
              <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">ADD TESTIMONY</span>
              <h3 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.84] tracking-crushed">PUT IT<br />ON RECORD</h3>
              <div className="mt-7 grid gap-4">
                <input required name="displayName" placeholder="DISPLAY NAME" className={styles.formInput} />
                <input required type="email" name="email" placeholder="EMAIL" className={styles.formInput} />
                <select name="rating" defaultValue="5" className={styles.formInput}>
                  <option value="5">5 / NO COMPLAINTS</option>
                  <option value="4">4 / STRONG</option>
                  <option value="3">3 / MIXED</option>
                  <option value="2">2 / ROUGH</option>
                  <option value="1">1 / FAILED</option>
                </select>
                <input name="orderReference" placeholder="ORDER REFERENCE / OPTIONAL" className={styles.formInput} />
                <input name="title" placeholder="HEADLINE / OPTIONAL" className={styles.formInput} />
                <textarea required name="text" rows={5} placeholder="WHAT HAPPENED?" className={`${styles.formInput} resize-none`} />
              </div>
              <div className="mt-5">
                <SickoButton type="submit" tone="blood" full>SUBMIT TESTIMONY</SickoButton>
              </div>
              {reviewSignal && <p className="mt-4 border-l border-blood-accent pl-3 font-body text-[0.78rem] font-semibold uppercase tracking-[0.13em] text-bone-white/65">{reviewSignal}</p>}
            </form>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="px-gutter py-[10vh]">
          <div className="mx-auto max-w-[1500px]">
            <span className="font-body text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-blood-accent">RELATED FILES</span>
            <div className="mt-7 grid gap-4 md:grid-cols-3">
              {related.map((entry) => (
                <Link key={entry.id} href={`/products/${entry.id}`} className="group border border-bone-white/15 p-5 transition-colors hover:border-blood-accent">
                  <div className="relative aspect-[4/5] overflow-hidden bg-off-black">
                    <Image src={entry.still} alt={entry.alt} fill sizes="33vw" className="media-product object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                  </div>
                  <p className="mt-5 font-display text-3xl leading-[0.9] tracking-crushed">{entry.name}</p>
                  <p className="mt-2 font-body text-sm font-semibold uppercase tracking-[0.15em] text-concrete-gray">OPEN FILE →</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
