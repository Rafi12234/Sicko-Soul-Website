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

  const [dismissed, setDismissed] = useState(false);

  useLayoutEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);

    const ctx = gsap.context(() => {
      const build = (scale: number) => {
        const counter = { value: 0 };

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
      >
        <div className="flex items-start justify-between gap-8">
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

      <div
        ref={barRef}
        className={`${styles.bar} pointer-events-none absolute inset-x-0 bottom-0 h-px bg-bone-white/70`}
      />
    </div>
  );
}
