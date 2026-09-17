"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE, STAGGER } from "@/styles/theme";
import { useAppStore } from "@/store/useAppStore";
import { PRODUCT_CATEGORIES, PRODUCTS_COPY } from "@/data/products";
import ProductRecord from "./ProductRecord";
import styles from "./ProductArchive.module.css";

export default function ProductArchive() {
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const selectorRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const activeNameRef = useRef<HTMLSpanElement>(null);
  const firstRenderRef = useRef(true);
  const switchingRef = useRef(false);

  const [activeId, setActiveId] = useState<string>(PRODUCT_CATEGORIES[0].id);
  const activeCategory = useMemo(
    () => PRODUCT_CATEGORIES.find((category) => category.id === activeId) ?? PRODUCT_CATEGORIES[0],
    [activeId],
  );

  const imageCount = useMemo(
    () =>
      1 +
      activeCategory.products.reduce(
        (sum, product) => sum + 1 + (product.worn ? 1 : 0),
        0,
      ),
    [activeCategory],
  );

  const placeCategoryMarker = (instant = false) => {
    const marker = markerRef.current;
    const selector = selectorRef.current;
    const button = selector?.querySelector<HTMLElement>(
      `[data-category-button="${activeId}"]`,
    );
    if (!marker || !button) return;

    gsap.to(marker, {
      y: button.offsetTop + button.offsetHeight - 1,
      scaleX: 1,
      duration: instant ? 0 : 0.55,
      ease: EASE.expo,
      overwrite: "auto",
    });
  };

  useLayoutEffect(() => {
    // /products has no cinematic Preloader. Release the root Lenis gate before
    // SmoothScroll's parent layout effect runs.
    useAppStore.getState().setHasEntered(true);
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      const heroSplit = new SplitText(".products-hero-split", { type: "chars" });

      gsap
        .timeline({ defaults: { ease: EASE.expo } })
        .from(".products-hero-meta", { autoAlpha: 0, y: 18, duration: 0.65 })
        .from(
          heroSplit.chars,
          {
            yPercent: 120,
            autoAlpha: 0,
            rotate: 4,
            duration: 1.05,
            stagger: 0.028,
          },
          "-=0.25",
        )
        .from(
          ".products-hero-script",
          { xPercent: 30, autoAlpha: 0, rotate: 8, duration: 0.9, ease: EASE.overshoot },
          "-=0.72",
        )
        .from(
          ".products-hero-rule",
          { scaleX: 0, duration: 0.9, transformOrigin: "left center" },
          "-=0.55",
        );

      gsap.from(".products-category-button", {
        yPercent: 50,
        autoAlpha: 0,
        duration: 0.85,
        stagger: 0.055,
        ease: EASE.expo,
        scrollTrigger: {
          id: "products-category-index",
          trigger: selectorRef.current,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      placeCategoryMarker(true);
      const onResize = () => placeCategoryMarker(true);
      window.addEventListener("resize", onResize);

      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".products-hero-ghost", {
          yPercent: 18,
          ease: "none",
          scrollTrigger: {
            id: "products-hero-drift",
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      const ticker = root.querySelector<HTMLElement>(".products-ticker-track");
      let tickerTween: gsap.core.Tween | null = null;
      if (ticker) {
        const half = ticker.scrollWidth / 2;
        tickerTween = gsap.fromTo(
          ticker,
          { x: 0 },
          { x: -half, duration: 26, ease: "none", repeat: -1 },
        );
        tickerTween.pause();

        ScrollTrigger.create({
          id: "products-ticker-loop",
          trigger: ".products-outro",
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? tickerTween?.play() : tickerTween?.pause()),
        });
      }

      return () => {
        heroSplit.revert();
        tickerTween?.kill();
        window.removeEventListener("resize", onResize);
      };
    }, root);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    placeCategoryMarker(firstRenderRef.current);

    const ctx = gsap.context(() => {
      const records = gsap.utils.toArray<HTMLElement>(".archive-record", stage);

      ScrollTrigger.batch(records, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 80, autoAlpha: 0, rotate: 0.8 },
            {
              y: 0,
              autoAlpha: 1,
              rotate: 0,
              duration: 1.05,
              stagger: STAGGER.images,
              ease: EASE.expo,
              overwrite: true,
            },
          ),
      });

      if (firstRenderRef.current) {
        firstRenderRef.current = false;
        return;
      }

      gsap.fromTo(
        ".products-category-stage",
        { clipPath: "inset(0 0 100% 0)" },
        {
          clipPath: "inset(0 0 0% 0)",
          duration: 0.85,
          ease: EASE.inOut,
          clearProps: "clipPath",
          onComplete: () => {
            switchingRef.current = false;
            ScrollTrigger.refresh();
          },
        },
      );

      gsap.from(".products-category-copy > *", {
        y: 24,
        autoAlpha: 0,
        duration: 0.7,
        stagger: 0.055,
        ease: EASE.expo,
      });
    }, stage);

    return () => ctx.revert();
  }, [activeId]);

  const switchCategory = (id: string) => {
    const next = PRODUCT_CATEGORIES.find((category) => category.id === id);
    if (!next) return;

    const target = stageRef.current;
    if (id === activeId) {
      if (target) {
        gsap.to(window, {
          scrollTo: { y: target, offsetY: 70 },
          duration: 1.15,
          ease: EASE.inOut,
        });
      }
      gsap.fromTo(
        `[data-category-button="${id}"]`,
        { x: -8 },
        { x: 0, duration: 0.4, ease: EASE.overshoot },
      );
      return;
    }

    if (switchingRef.current) return;
    switchingRef.current = true;

    const nextImageCount =
      1 + next.products.reduce((sum, product) => sum + 1 + (product.worn ? 1 : 0), 0);

    const tl = gsap.timeline({ defaults: { ease: EASE.inOut } });
    tl.to(".archive-record", {
      y: -30,
      autoAlpha: 0,
      duration: 0.35,
      stagger: 0.035,
      overwrite: true,
    })
      .to(
        ".products-category-stage",
        { clipPath: "inset(0 0 100% 0)", duration: 0.55, overwrite: true },
        0,
      )
      .to(
        activeNameRef.current,
        {
          duration: 0.42,
          scrambleText: { text: next.name, chars: "upperCase", speed: 1 },
        },
        0.08,
      )
      .to(
        countRef.current,
        {
          duration: 0.42,
          scrambleText: {
            text: `${String(next.products.length).padStart(2, "0")} PIECES / ${String(nextImageCount).padStart(2, "0")} IMAGES`,
            chars: "upperCase",
            speed: 1,
          },
        },
        0.08,
      )
      .call(() => setActiveId(id));

    if (target) {
      gsap.to(window, {
        scrollTo: { y: target, offsetY: 70 },
        duration: 1.15,
        ease: EASE.inOut,
        delay: 0.12,
      });
    }
  };

  return (
    <div ref={rootRef} className="relative overflow-hidden bg-black text-bone-white">
      <section
        ref={heroRef}
        id="top"
        className={`${styles.hero} relative flex min-h-[92svh] items-end overflow-hidden border-b border-bone-white/15 px-gutter pb-[9vh] pt-32`}
      >
        <div aria-hidden className={`${styles.heroGrid} absolute inset-0`} />
        <div
          aria-hidden
          className="products-hero-ghost text-distress pointer-events-none absolute -right-[0.04em] top-[9vh] font-display text-[34vw] leading-[0.68] text-outline-2 opacity-[0.14]"
        >
          00
        </div>

        <div className="relative z-10 w-full">
          <div className="products-hero-meta flex flex-wrap items-center justify-between gap-5 border-b border-bone-white/15 pb-4">
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-blood-accent" />
              <p className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
                {PRODUCTS_COPY.eyebrow}
              </p>
            </div>
            <p className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
              {PRODUCTS_COPY.heroMeta}
            </p>
          </div>

          <div className="mt-[8vh]">
            <p className="products-hero-meta max-w-[34ch] font-stencil text-[0.58rem] leading-[1.9] tracking-stencil text-concrete-gray">
              {PRODUCTS_COPY.heroKicker}
            </p>

            <h1 className="mt-5 leading-none">
              <span className="split-mask block pb-[0.08em]">
                <span className="products-hero-split text-distress block font-display text-[clamp(5rem,14vw,14rem)] leading-[0.72] tracking-crushed text-bone-white">
                  {PRODUCTS_COPY.heroLineOne}
                </span>
              </span>
              <span className="split-mask block pb-[0.08em]">
                <span className="products-hero-split text-distress block font-display text-[clamp(5rem,14vw,14rem)] leading-[0.72] tracking-crushed text-bone-white">
                  {PRODUCTS_COPY.heroLineTwo}
                </span>
              </span>
              <span className="products-hero-script -mt-[0.08em] block pl-[11vw] font-script text-[clamp(3rem,9vw,9rem)] leading-[0.82] text-blood-accent">
                {PRODUCTS_COPY.heroScript}
              </span>
            </h1>

            <span className="products-hero-rule mt-[5vh] block h-px w-full bg-bone-white/20" />
          </div>
        </div>
      </section>

      <section
        ref={selectorRef}
        className="relative border-b border-bone-white/15 bg-off-black px-gutter py-[10vh]"
        aria-labelledby="products-index-heading"
      >
        <div className="mb-[6vh] flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-blood-accent" />
              <p className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
                CATEGORY INDEX
              </p>
            </div>
            <h2
              id="products-index-heading"
              className="mt-4 font-blackletter text-[clamp(2.8rem,6vw,6.2rem)] leading-[0.85] text-bone-white"
            >
              {PRODUCTS_COPY.select}
            </h2>
          </div>
          <p className="max-w-[31ch] font-stencil text-[0.52rem] leading-[1.8] tracking-stencil text-concrete-gray md:text-right">
            {PRODUCTS_COPY.selectAside}
          </p>
        </div>

        <div className="relative border-t border-bone-white/15">
          <span
            ref={markerRef}
            aria-hidden
            className={`${styles.categoryMarker} pointer-events-none absolute inset-x-0 top-0 hidden bg-blood-accent md:block`}
          />

          {PRODUCT_CATEGORIES.map((category) => {
            const active = category.id === activeId;
            return (
              <button
                key={category.id}
                type="button"
                data-category-button={category.id}
                aria-pressed={active}
                onClick={() => switchCategory(category.id)}
                className={`${styles.categoryButton} products-category-button group relative grid w-full grid-cols-[auto_1fr_auto] items-center gap-5 border-b border-bone-white/15 py-5 text-left md:grid-cols-[5rem_1fr_12rem_4rem] md:py-7`}
              >
                <span className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray group-hover:text-blood-accent">
                  {category.index}
                </span>
                <span
                  className={`font-display text-[clamp(2rem,5vw,5.5rem)] leading-[0.82] tracking-crushed transition-colors duration-300 ${
                    active ? "text-bone-white" : "text-concrete-gray"
                  }`}
                >
                  {category.name}
                </span>
                <span className="hidden font-stencil text-[0.5rem] tracking-stencil text-concrete-gray md:block">
                  {String(category.products.length).padStart(2, "0")} PIECES
                </span>
                <span
                  aria-hidden
                  className={`font-display text-[1.4rem] transition-transform duration-300 ease-hard ${
                    active ? "rotate-90 text-blood-accent" : "text-bone-white/50 group-hover:translate-x-2"
                  }`}
                >
                  →
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section ref={stageRef} className="products-category-stage relative bg-black px-gutter pb-[12vh] pt-[10vh]">
        <div className="products-category-copy grid gap-10 border-b border-bone-white/15 pb-[9vh] lg:grid-cols-12 lg:gap-x-[4vw]">
          <div className="relative lg:col-span-7">
            <div className="theme-light relative w-[88%] bg-black p-2 shadow-print md:w-[72%] lg:w-[78%]">
              <div className={`${styles.coverFrame} relative aspect-[4/3] overflow-hidden bg-off-black`}>
                <Image
                  key={activeCategory.cover}
                  src={activeCategory.cover}
                  alt={activeCategory.coverAlt}
                  fill
                  priority
                  sizes="(max-width: 768px) 88vw, 55vw"
                  className="media-product object-cover"
                />
                <span aria-hidden className={`${styles.mediaVignette} absolute inset-0`} />
                <span className="absolute left-4 top-4 z-10 bg-black/70 px-2 py-1 font-stencil text-[0.5rem] tracking-stencil text-bone-white/70">
                  CATEGORY FRAME / {activeCategory.index}
                </span>
              </div>
            </div>

            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-[0.15em] right-[-0.04em] font-display text-[24vw] leading-none text-outline-2 opacity-[0.16] lg:text-[14vw]"
            >
              {activeCategory.index}
            </span>
          </div>

          <div className="relative z-10 lg:col-span-5 lg:flex lg:flex-col lg:justify-end">
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-blood-accent" />
              <span className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
                {PRODUCTS_COPY.active}
              </span>
            </div>

            <p className="mt-5 font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
              {activeCategory.registry}
            </p>

            <h2 className="mt-4 max-w-[9ch] font-display text-[clamp(4rem,9vw,9rem)] leading-[0.76] tracking-crushed text-bone-white">
              <span ref={activeNameRef}>{activeCategory.name}</span>
            </h2>

            <p className="mt-6 font-stencil text-[0.58rem] tracking-stencil text-blood-accent">
              {activeCategory.spec}
            </p>
            <p className="mt-4 max-w-[31ch] font-body text-body-lg text-bone-white/65">
              {activeCategory.line}
            </p>

            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-bone-white/15 py-4">
              <span
                ref={countRef}
                className="font-stencil text-[0.52rem] tracking-stencil text-bone-white"
              >
                {String(activeCategory.products.length).padStart(2, "0")} PIECES / {String(imageCount).padStart(2, "0")} IMAGES
              </span>
              <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
                ALL CLEARED FRAMES BELOW
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          {activeCategory.products.map((product, index) => (
            <ProductRecord key={product.id} product={product} ordinal={index} />
          ))}
        </div>
      </section>

      <section className="products-outro relative overflow-hidden border-t border-bone-white/15 bg-off-black pt-[10vh]">
        <div className="overflow-hidden border-y border-bone-white/15 py-3">
          <div className={`${styles.tickerTrack} products-ticker-track flex w-max`}>
            {[0, 1].map((copy) => (
              <span
                key={copy}
                aria-hidden={copy === 1}
                className="whitespace-nowrap font-stencil text-[0.55rem] tracking-stencil text-concrete-gray"
              >
                {PRODUCTS_COPY.ticker.repeat(7)}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-10 px-gutter py-[12vh] lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="font-stencil text-[0.52rem] tracking-stencil text-blood-accent">
              {PRODUCTS_COPY.footerEyebrow}
            </p>
            <h2 className="mt-5 max-w-[12ch] font-display text-[clamp(3rem,8vw,8rem)] leading-[0.8] tracking-crushed text-bone-white">
              {PRODUCTS_COPY.footerLine}
            </h2>
          </div>
          <div className="lg:col-span-4 lg:flex lg:justify-end">
            <Link
              href="/"
              className={`${styles.homeLink} clip-cut group relative inline-flex min-w-[15rem] items-center justify-between overflow-hidden border border-bone-white/25 px-5 py-4`}
            >
              <span aria-hidden className={`${styles.homeLinkFill} absolute inset-0 bg-bone-white`} />
              <span className="relative z-10 font-stencil text-[0.55rem] tracking-stencil text-bone-white group-hover:text-black">
                {PRODUCTS_COPY.backHome}
              </span>
              <span className="relative z-10 font-display text-xl text-blood-accent">↗</span>
            </Link>
          </div>
        </div>

        <div className="overflow-hidden px-gutter pb-3">
          <p aria-hidden className="text-distress translate-y-[0.08em] whitespace-nowrap font-display text-[20vw] leading-[0.72] tracking-crushed text-bone-white/95">
            SICKO SOUL
          </p>
        </div>
      </section>
    </div>
  );
}
