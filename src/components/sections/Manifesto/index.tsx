"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { MANIFESTO_COPY } from "@/data/manifesto";
import styles from "./Manifesto.module.css";

export default function Manifesto() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const spineRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      const split = new SplitText(".manifesto-line", { type: "words" });
      // Cold start. Ink sits faint on the stock until it is read — lighter than
      // this and unread words vanish entirely against paper.
      gsap.set(split.words, { autoAlpha: 0.2 });
      gsap.set(".manifesto-verdict", { autoAlpha: 0, yPercent: 40 });

      const buildRead = (pinned: boolean) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            id: "manifesto-read",
            trigger: rootRef.current,
            start: pinned ? "top top" : "top 78%",
            end: pinned ? () => `+=${window.innerHeight * 1.9}` : "bottom 40%",
            pin: pinned ? pinRef.current : false,
            anticipatePin: pinned ? 1 : 0,
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });

        // The spotlight: words burn in one after another, never as a block.
        tl.to(
          split.words,
          { autoAlpha: 1, duration: 1, stagger: 0.35, ease: "none" },
          0,
        )
          .to(spineRef.current, { scaleY: 1, duration: split.words.length * 0.35, ease: "none" }, 0)
          .to(ghostRef.current, { yPercent: -22, autoAlpha: 0.1, ease: "none" }, 0)
          .to(
            ".manifesto-verdict",
            { autoAlpha: 1, yPercent: 0, duration: 2.2, ease: "power2.out" },
            ">-1.2",
          )
          .fromTo(
            ".manifesto-stamp",
            { autoAlpha: 0, scale: 1.8, rotate: -18 },
            { autoAlpha: 1, scale: 1, rotate: -9, duration: 1.4, ease: EASE.overshoot },
            ">-0.6",
          );

        return tl;
      };

      mm.add("(min-width: 768px)", () => {
        buildRead(true);
      });
      mm.add("(max-width: 767px)", () => {
        buildRead(false);
      });

      /* ---- Masthead sits outside the pin so it reads before the creed. ---- */
      gsap.from(q(".manifesto-meta"), {
        autoAlpha: 0,
        y: 18,
        duration: 0.8,
        stagger: 0.08,
        ease: EASE.hard,
        scrollTrigger: {
          id: "manifesto-meta",
          trigger: rootRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Continuous layer, parked until the section is on screen. ---- */
      const loops: gsap.core.Animation[] = [];

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const caret = gsap.to(".manifesto-caret", {
          autoAlpha: 0,
          duration: 0.52,
          ease: "steps(1)",
          repeat: -1,
          yoyo: true,
        });

        const breathe = gsap.to(glowRef.current, {
          opacity: 0.55,
          scale: 1.12,
          duration: 6.5,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
        });

        loops.push(caret, breathe);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "manifesto-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      return () => split.revert();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="manifesto" className="theme-graphite relative bg-black">
      <div ref={pinRef} className="relative flex min-h-screen flex-col justify-center overflow-hidden py-[12vh]">
        <span
          ref={glowRef}
          aria-hidden
          className={`${styles.glow} pointer-events-none absolute inset-0 z-0 opacity-30`}
        />

        <span
          aria-hidden
          className={`${styles.edge} pointer-events-none absolute right-2 top-[22vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
        >
          {MANIFESTO_COPY.aside}
        </span>

        {/* Hollow word drifts behind the creed for the whole read. */}
        <span
          ref={ghostRef}
          aria-hidden
          className={`${styles.ghost} pointer-events-none absolute -right-[4vw] top-[6vh] z-0 hidden font-blackletter text-[22vw] leading-none text-outline-2 opacity-[0.09] lg:block`}
        >
          {MANIFESTO_COPY.ghost}
        </span>

        <div className="relative z-10 px-gutter">
          <div className="manifesto-meta flex items-center gap-4">
            <span className="h-px w-12 bg-blood-accent" />
            <span className="font-stencil text-stamp text-concrete-gray">
              {MANIFESTO_COPY.eyebrow}
            </span>
          </div>
        </div>

        {/* Spine on the left fills as the creed is read. */}
        <div className="relative z-10 mt-[6vh] flex gap-6 px-gutter sm:gap-10">
          <div className="hidden shrink-0 flex-col items-center gap-4 sm:flex">
            <span className="block h-[38vh] w-px bg-bone-white/12">
              <span
                ref={spineRef}
                className={`${styles.spineFill} block h-full w-full bg-blood-accent`}
              />
            </span>
            <span
              aria-hidden
              className={`${styles.edge} font-stencil text-[0.5rem] tracking-stencil text-concrete-gray`}
            >
              {MANIFESTO_COPY.progress}
            </span>
          </div>

          {/* The creed is a sheet laid on the table, not a white section.
              Sized so the whole page reads inside one pinned viewport. */}
          <div
            className={`${styles.sheet} theme-light relative max-w-[50rem] bg-black px-[5vw] py-[4.5vh] shadow-print lg:ml-[4%] lg:px-[3vw]`}
          >
            {/* Ruled margin down the sheet, like a filing document. */}
            <span
              aria-hidden
              className="absolute inset-y-0 left-[3.2vw] hidden w-px bg-blood-accent/25 lg:block"
            />

            <div className="manifesto-meta mb-5 flex items-center gap-3">
              <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
                {MANIFESTO_COPY.sheetRef}
              </span>
              <span className="h-px flex-1 bg-bone-white/15" />
            </div>

            {MANIFESTO_COPY.lines.map((line) => (
              <p
                key={line}
                className="manifesto-line font-display text-[clamp(1.15rem,2.5vw,2.1rem)] uppercase leading-[1.12] text-bone-white"
              >
                {line}
              </p>
            ))}

            <p className="manifesto-verdict mt-7 font-blackletter text-[clamp(1.15rem,2.4vw,2.05rem)] leading-[1.2] text-blood-accent">
              {MANIFESTO_COPY.verdict}
              <span
                aria-hidden
                className={`${styles.caret} manifesto-caret ml-3 inline-block h-[0.75em] w-[0.42em] translate-y-[0.06em] bg-blood-accent align-middle`}
              />
            </p>

            <div className="manifesto-meta mt-7 flex items-center gap-5">
              <span className="h-px w-16 bg-bone-white/20" />
              <span className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
                {MANIFESTO_COPY.sign}
              </span>
            </div>
          </div>
        </div>

        {/* Slams on once the creed has fully burned in. */}
        <span
          aria-hidden
          className={`${styles.stamp} manifesto-stamp pointer-events-none absolute bottom-[9vh] right-[6vw] z-10 hidden border-2 border-blood-accent px-6 py-3 font-stencil text-[clamp(0.7rem,1.6vw,1.1rem)] tracking-stencil text-blood-accent opacity-0 md:block`}
        >
          {MANIFESTO_COPY.stamp}
        </span>
      </div>
    </section>
  );
}
