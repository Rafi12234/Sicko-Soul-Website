"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { useAppStore } from "@/store/useAppStore";
import { PRELOADER_COPY } from "@/data/preloader";
import styles from "./Preloader.module.css";

export default function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelTopRef = useRef<HTMLDivElement>(null);
  const panelBottomRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLHeadingElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);

  const [dismissed, setDismissed] = useState(false);

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);

      const build = (scale: number) => {
        const counter = { value: 0 };
        const chars = q(".pre-core-char");

        // Letters start thrown across the screen and get pulled into register.
        gsap.set(chars, {
          autoAlpha: 0,
          x: () => gsap.utils.random(-260, 260),
          y: () => gsap.utils.random(-170, 170),
          rotate: () => gsap.utils.random(-70, 70),
          scale: () => gsap.utils.random(0.3, 2.1),
        });
        gsap.set(".pre-core-rule", { scaleX: 0 });
        gsap.set(".pre-core-ghost", { autoAlpha: 0, x: 0 });

        const tl = gsap.timeline({
          defaults: { ease: EASE.hard },
          onComplete: () => {
            useAppStore.getState().setHasEntered(true);
            setDismissed(true);
          },
        });

        tl.to(
          wordmarkRef.current,
          {
            duration: 1.1 * scale,
            ease: "power2.inOut",
            scrambleText: {
              text: PRELOADER_COPY.wordmark,
              chars: "upperCase",
              speed: 0.7,
              revealDelay: 0.3,
            },
          },
          0,
        )
          .to(
            counter,
            {
              value: 100,
              duration: 2.4 * scale,
              ease: "power2.inOut",
              snap: { value: 1 },
              onUpdate: () => {
                if (!counterRef.current) return;
                counterRef.current.textContent = String(Math.round(counter.value)).padStart(3, "0");
              },
            },
            0,
          )
          .fromTo(
            barRef.current,
            { scaleX: 0 },
            { scaleX: 1, duration: 2.4 * scale, ease: "power2.inOut" },
            0,
          )
          // Letters snap into register one by one as the count climbs.
          .to(
            chars,
            {
              autoAlpha: 1,
              x: 0,
              y: 0,
              rotate: 0,
              scale: 1,
              duration: 1.15 * scale,
              stagger: { each: 0.08 * scale, from: "random" },
              ease: EASE.overshoot,
            },
            0.15 * scale,
          )
          .to(
            ".pre-core-rule",
            { scaleX: 1, duration: 0.9 * scale, ease: EASE.expo },
            1.1 * scale,
          )
          .to(
            subRef.current,
            {
              duration: 0.9 * scale,
              ease: "power2.inOut",
              scrambleText: {
                text: PRELOADER_COPY.core.sub,
                chars: "upperCase",
                speed: 0.8,
              },
            },
            1.2 * scale,
          )
          // Registration slips, then a blade of light crosses the mark.
          .to(
            ".pre-core-ghost",
            {
              keyframes: [
                { autoAlpha: 0.9, x: -9, duration: 0.06 },
                { autoAlpha: 0.5, x: 7, duration: 0.06 },
                { autoAlpha: 0, x: 0, duration: 0.1 },
              ],
              ease: "none",
            },
            1.65 * scale,
          )
          .fromTo(
            ".pre-core-scan",
            { y: 0, autoAlpha: 1 },
            {
              y: () => coreRef.current?.querySelector(".pre-core-mark")?.clientHeight ?? 0,
              autoAlpha: 0,
              duration: 0.5 * scale,
              ease: "power2.in",
            },
            1.7 * scale,
          )
          .to(
            ".pre-core-ghost",
            {
              keyframes: [
                { autoAlpha: 0.8, x: 6, duration: 0.05 },
                { autoAlpha: 0, x: 0, duration: 0.09 },
              ],
              ease: "none",
            },
            2.15 * scale,
          )
          .to(
            statusRef.current,
            {
              duration: 0.5 * scale,
              ease: "power2.inOut",
              scrambleText: {
                text: PRELOADER_COPY.status[1],
                chars: "upperCase",
                speed: 0.9,
              },
            },
            0.95 * scale,
          )
          .to(
            statusRef.current,
            {
              duration: 0.5 * scale,
              ease: "power2.inOut",
              scrambleText: {
                text: PRELOADER_COPY.status[2],
                chars: "upperCase",
                speed: 0.9,
              },
            },
            2.05 * scale,
          )
          // Content clears out first so the panels split across empty black.
          .to(
            contentRef.current,
            { yPercent: -6, autoAlpha: 0, duration: 0.5 * scale, ease: EASE.expo },
            "+=0.3",
          )
          .to(
            coreRef.current,
            { scale: 1.35, autoAlpha: 0, duration: 0.6 * scale, ease: EASE.expo },
            "<",
          )
          .to(barRef.current, { autoAlpha: 0, duration: 0.4 * scale, ease: EASE.expo }, "<")
          .to(
            panelTopRef.current,
            { yPercent: -100, duration: 1.05 * scale, ease: EASE.inOut },
            "<0.12",
          )
          .to(
            panelBottomRef.current,
            { yPercent: 100, duration: 1.05 * scale, ease: EASE.inOut },
            "<",
          );

        return tl;
      };

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        build(1);
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        build(0.22);
      });
    }, rootRef);

    return () => {
      document.body.style.overflow = previousOverflow;
      ctx.revert();
    };
  }, []);

  if (dismissed) return null;

  return (
    <div ref={rootRef} className="fixed inset-0 z-preloader overflow-hidden" role="presentation">
      <div ref={panelTopRef} className={`${styles.panel} absolute inset-x-0 top-0 h-1/2 bg-black`} />
      <div
        ref={panelBottomRef}
        className={`${styles.panel} absolute inset-x-0 bottom-0 h-1/2 bg-black`}
      />

      <div
        ref={contentRef}
        className="absolute inset-0 flex flex-col justify-between px-gutter py-gutter"
      >        <div className="flex items-start justify-between gap-8">
          <p className="font-stencil text-stamp text-concrete-gray">{PRELOADER_COPY.eyebrow}</p>
          <p className="font-stencil text-stamp text-blood-accent">{PRELOADER_COPY.tag}</p>
        </div>

        <div className="relative">
          <span
            ref={statusRef}
            className="mb-4 block font-stencil text-stamp text-concrete-gray"
          >
            {PRELOADER_COPY.status[0]}
          </span>

          <h1
            ref={wordmarkRef}
            className="text-distress -ml-gutter font-display text-display-xl leading-[0.85]"
          >
            {PRELOADER_COPY.wordmarkCipher}
          </h1>

          {/* Blend-difference inverts the digits where they cross the wordmark. */}
          <span
            ref={counterRef}
            className={`${styles.counter} pointer-events-none absolute -bottom-[0.06em] right-0 font-display text-hero leading-none mix-blend-difference`}
          >
            000
          </span>
        </div>
      </div>

      {/* Centre lockup: assembles out of scattered letters while the count runs. */}
      <div
        ref={coreRef}
        className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-gutter"
      >
        <div className="relative">
          <span aria-hidden className={`${styles.coreMark} pre-core-mark block font-gothic text-[clamp(2.6rem,7.5vw,6rem)] leading-none text-bone-white`}>
            {PRELOADER_COPY.core.mark.split("").map((char, i) => (
              <span key={`${char}-${i}`} className={`${styles.coreChar} pre-core-char`}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>

          {/* Blood ghost sitting a hair off register behind the mark. */}
          <span
            aria-hidden
            className={`${styles.coreGhost} pre-core-ghost absolute inset-0 block font-gothic text-[clamp(2.6rem,7.5vw,6rem)] leading-none text-blood-accent`}
          >
            {PRELOADER_COPY.core.mark}
          </span>

          <span
            aria-hidden
            className={`${styles.coreScan} pre-core-scan absolute inset-x-[-6%] top-0 h-[2px] bg-blood-accent opacity-0`}
          />
        </div>

        <div className="mt-6 flex w-full max-w-[34rem] items-center gap-4">
          <span className={`${styles.coreRule} pre-core-rule h-px flex-1 origin-right bg-bone-white/35`} />
          <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
            {PRELOADER_COPY.core.rule}
          </span>
          <span className={`${styles.coreRule} pre-core-rule h-px flex-1 origin-left bg-bone-white/35`} />
        </div>

        <span
          ref={subRef}
          className="mt-5 block text-center font-stencil text-[0.58rem] tracking-stencil text-bone-white/75"
        >
          {PRELOADER_COPY.core.subCipher}
        </span>
      </div>

      <div
        ref={barRef}
        className={`${styles.bar} pointer-events-none absolute inset-x-0 bottom-0 h-px bg-bone-white/70`}
      />
    </div>
  );
}
