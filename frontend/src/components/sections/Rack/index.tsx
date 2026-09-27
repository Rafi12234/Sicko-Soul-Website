"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE, STAGGER } from "@/styles/theme";
import { RACK_COPY, type RackProduct } from "@/data/rack";
import { getProductVariants, type ArchiveCategory } from "@/data/products";
import RackCard from "./RackCard";
import styles from "./Rack.module.css";

/** Column baselines. Nothing in this grid lines up on purpose. */
const OFFSET = ["lg:mt-0", "lg:mt-[6vh]", "lg:mt-[2vh]", "lg:mt-[8vh]"];

export default function Rack({ catalogCategories }: { catalogCategories: readonly ArchiveCategory[] }) {
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const ctxRef = useRef<ReturnType<typeof gsap.context> | null>(null);
  const activeRef = useRef<string>(catalogCategories[0]?.id ?? "");
  const swappingRef = useRef(false);
  const firstRunRef = useRef(true);

  const [activeId, setActiveId] = useState<string>(catalogCategories[0]?.id ?? "");
  const activeCatalogCategory = catalogCategories.find((category) => category.id === activeId);
  const products: RackProduct[] = (activeCatalogCategory?.products ?? []).map((product) => {
    const variants = getProductVariants(product);
    const defaultVariant =
      variants.find(
        (variant) => variant.isDefault && variant.status === "ACTIVE" && variant.availableQty > 0,
      ) ?? variants.find((variant) => variant.status === "ACTIVE" && variant.availableQty > 0);

    return {
      id: product.id,
      index: product.index,
      name: product.name,
      still: product.still,
      worn: product.worn ?? product.still,
      price: product.price,
      spec: product.spec,
      line: product.line,
      variantId: defaultVariant?.id,
      available: Boolean(defaultVariant),
    };
  });

  const placeMarker = (instant: boolean) => {
    const rail = railRef.current;
    const marker = markerRef.current;
    const tab = rail?.querySelector<HTMLElement>(`[data-tab="${activeRef.current}"]`);
    if (!marker || !tab) return;

    gsap.to(marker, {
      x: tab.offsetLeft,
      y: tab.offsetTop,
      width: tab.offsetWidth,
      height: tab.offsetHeight,
      duration: instant ? 0 : 0.5,
      ease: EASE.expo,
      overwrite: "auto",
    });
  };

  /* ---- One-time wiring: heading, card entry, scroll-velocity shear. ---- */
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      placeMarker(true);

      const headingSplit = new SplitText(".rack-heading", { type: "chars" });

      // Heading and rail share one trigger. A separate trigger anchored on the
      // rail resolved against the pinned section above and never fired, which
      // left the category buttons hidden and unclickable.
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "rack-intro",
          trigger: rootRef.current,
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: -120,
          autoAlpha: 0,
          skewY: 7,
          duration: 1.05,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".rack-rail-tab",
          {
            yPercent: 60,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.055,
            ease: EASE.expo,
          },
          "-=0.65",
        );

      const cards = gsap.utils.toArray<HTMLElement>(".rack-card", gridRef.current);
      ScrollTrigger.batch(cards, {
        start: "top 88%",
        onEnter: (batch) =>
          gsap.from(batch, {
            yPercent: 20,
            autoAlpha: 0,
            rotate: -1.6,
            duration: 1.05,
            stagger: STAGGER.images,
            ease: EASE.expo,
            overwrite: true,
          }),
      });

      let resizeFrame = 0;
      const onResize = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => placeMarker(true));
      };
      window.addEventListener("resize", onResize, { passive: true });

      return () => {
        headingSplit.revert();
        cancelAnimationFrame(resizeFrame);
        window.removeEventListener("resize", onResize);
      };
    }, rootRef);

    ctxRef.current = ctx;
    return () => {
      ctxRef.current = null;
      ctx.revert();
    };
  }, []);

  /* ---- Category swap: marker travel, unit readout, incoming card reveal. --- */
  useLayoutEffect(() => {
    activeRef.current = activeId;
    placeMarker(firstRunRef.current);

    const count = `${String(products.length).padStart(2, "0")} ${RACK_COPY.unit}`;

    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }

    ctxRef.current?.add(() => {
      gsap.to(countRef.current, {
        duration: 0.5,
        ease: "power2.inOut",
        scrambleText: { text: count, chars: "upperCase", speed: 1 },
      });

      const cards = gsap.utils.toArray<HTMLElement>(".rack-card", gridRef.current);
      gsap.fromTo(
        cards,
        { yPercent: 24, autoAlpha: 0, rotate: 2 },
        {
          yPercent: 0,
          autoAlpha: 1,
          rotate: 0,
          duration: 0.95,
          stagger: STAGGER.images,
          ease: EASE.expo,
          overwrite: true,
          onComplete: () => {
            swappingRef.current = false;
          },
        },
      );
    });
  }, [activeId, products.length]);

  const pulse = () => {
    ctxRef.current?.add(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".rack-card", gridRef.current);
      gsap.to(cards, {
        yPercent: -7,
        duration: 0.22,
        stagger: 0.04,
        ease: EASE.hard,
        yoyo: true,
        repeat: 1,
      });
    });
  };

  const handleSelect = (category: ArchiveCategory) => {
    if (category.id === activeRef.current) {
      pulse();
      return;
    }
    if (swappingRef.current) return;
    swappingRef.current = true;

    ctxRef.current?.add(() => {
      const cards = gsap.utils.toArray<HTMLElement>(".rack-card", gridRef.current);
      gsap.to(cards, {
        yPercent: -20,
        autoAlpha: 0,
        rotate: -2,
        duration: 0.4,
        stagger: 0.05,
        ease: EASE.inOut,
        overwrite: true,
        onComplete: () => setActiveId(category.id),
      });
    });
  };

  return (
    <section ref={rootRef} id="rack" className="theme-graphite relative bg-black pb-[14vh] pt-[12vh]">
      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-[22vh] hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {RACK_COPY.edge}
      </span>

      <div className="flex items-start justify-between gap-8 px-gutter">
        <div>
          <div className="flex items-center gap-4">
            <span className="h-px w-12 bg-blood-accent" />
            <p className="font-stencil text-stamp text-concrete-gray">{RACK_COPY.eyebrow}</p>
          </div>
          <p className="mt-3 max-w-[28ch] font-stencil text-stamp text-concrete-gray">
            {RACK_COPY.aside}
          </p>
        </div>
        <p className="hidden max-w-[22ch] text-right font-stencil text-stamp text-concrete-gray lg:block">
          {RACK_COPY.hint}
        </p>
      </div>

      {/* Line one anchors left, line two hangs off the right gutter and rides
          up into it — the lockup shares no skeleton with Segments. */}
      <h2 className="mt-[4vh]">
        <span className="split-mask block px-gutter pb-[0.08em]">
          <span className="rack-heading text-distress block font-display text-display text-bone-white">
            {RACK_COPY.heading}
          </span>
        </span>
        <span className="split-mask -mt-[2.4vw] block px-gutter pb-[0.12em] text-right">
          <span className="rack-heading block whitespace-nowrap font-gothic text-display-xl text-outline-blood">
            {RACK_COPY.headingAlt}
          </span>
        </span>
      </h2>

      <div className="relative mt-[5vh] px-gutter">
        <div className="hairline" />
        <div ref={railRef} className="relative flex flex-wrap">
          <span
            ref={markerRef}
            aria-hidden
            className={`${styles.marker} pointer-events-none absolute left-0 top-0 z-0 bg-bone-white`}
          />
          {catalogCategories.map((category) => {
            const isActive = category.id === activeId;
            const tone = isActive ? "text-black delay-150" : "text-bone-white";

            return (
              <button
                key={category.id}
                type="button"
                data-tab={category.id}
                aria-pressed={isActive}
                onClick={() => handleSelect(category)}
                className={`rack-rail-tab relative z-10 flex items-baseline gap-3 border-l border-bone-white/12 px-5 py-4 transition-colors duration-200 ease-hard first:border-l-0 ${tone}`}
              >
                <span className="font-stencil text-[0.58rem] tracking-stencil">
                  {category.index}
                </span>
                <span className="font-display text-[clamp(0.95rem,2.1vw,1.55rem)] leading-none tracking-crushed">
                  {category.name}
                </span>
              </button>
            );
          })}
        </div>
        <div className="hairline" />

        <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <span ref={countRef} className="font-stencil text-stamp text-bone-white/70">
            {`${String(products.length).padStart(2, "0")} ${RACK_COPY.unit}`}
          </span>
          <span className="font-stencil text-stamp text-concrete-gray lg:hidden">
            {RACK_COPY.hint}
          </span>
        </div>

      </div>

      <div className="relative">
        <div
          ref={gridRef}
          className={`${styles.grid} mt-[9vh] grid grid-cols-1 gap-x-6 gap-y-[9vh] px-gutter sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-[11vh]`}
        >
          {products.length === 0 ? (
            <div className="border border-bone-white/15 p-6 font-stencil text-stamp text-concrete-gray sm:col-span-2 lg:col-span-4">
              {RACK_COPY.empty}
            </div>
          ) : null}

          {products.map((product, index) => (
            <RackCard
              key={product.id}
              product={product}
              offsetClass={OFFSET[index % OFFSET.length]}
            />
          ))}

          {/* Withheld categories get a plate, never a filler photograph. */}
          <div
            className={`${styles.hatch} flex flex-col justify-between gap-8 border border-bone-white/12 p-8 sm:col-span-2 lg:col-span-4 lg:mt-[4vh] lg:flex-row lg:items-end`}
          >
            <div>
              <p className="font-stencil text-stamp text-blood-accent">{RACK_COPY.closing.stamp}</p>
              <p className="mt-6 max-w-[18ch] font-display text-segment uppercase leading-none text-outline-2">
                {RACK_COPY.closing.line}
              </p>
            </div>
            <div className="lg:w-[28%]">
              <div className="hairline" />
              <p className="mt-4 font-stencil text-[0.6rem] tracking-stencil text-concrete-gray">
                {RACK_COPY.closing.meta}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
