
"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { MANIFESTO_COPY } from "@/data/manifesto";
import styles from "./Manifesto.module.css";

export default function Manifesto() {
  const rootRef = useRef<HTMLElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const spineRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const split = new SplitText(".manifesto-paragraph", {
        type: "words",
      });

      if (reducedMotion) {
        gsap.set(spineRef.current, { scaleY: 1 });
        gsap.set(".manifesto-verdict", {
          autoAlpha: 1,
          y: 0,
        });
        gsap.set(".manifesto-stamp", {
          autoAlpha: 1,
          rotate: -7,
          scale: 1,
        });
      } else {
        gsap.set(split.words, {
          autoAlpha: 0.42,
          y: 16,
          filter: "blur(2px)",
        });

        gsap.set(".manifesto-verdict", {
          autoAlpha: 0.25,
          y: 12,
        });

        gsap.set(".manifesto-stamp", {
          autoAlpha: 0,
          scale: 1.28,
          rotate: -13,
        });

        gsap
          .timeline({
            scrollTrigger: {
              id: "manifesto-read",
              trigger: rootRef.current,
              start: "top 76%",
              once: true,
            },
          })
          .to(
            spineRef.current,
            {
              scaleY: 1,
              duration: 1.1,
              ease: EASE.expo,
            },
            0
          )
          .to(
            ghostRef.current,
            {
              yPercent: -9,
              duration: 2.4,
              ease: "power1.out",
            },
            0
          )
          .to(
            split.words,
            {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.4,
              stagger: 0.025,
              ease: "power3.out",
            },
            0.07
          )
          .to(
            ".manifesto-verdict",
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.75,
              ease: EASE.expo,
            },
            "+=0.1"
          )
          .to(
            ".manifesto-stamp",
            {
              autoAlpha: 1,
              scale: 1,
              rotate: -7,
              duration: 0.48,
              ease: EASE.overshoot,
            },
            "-=0.24"
          );
      }

      if (!reducedMotion) {
        gsap.from(".manifesto-meta", {
          autoAlpha: 0,
          y: 14,
          duration: 0.7,
          stagger: 0.08,
          ease: EASE.hard,
          scrollTrigger: {
            id: "manifesto-meta",
            trigger: rootRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        });

        const loops: gsap.core.Animation[] = [];

        loops.push(
          gsap.to(".manifesto-caret", {
            autoAlpha: 0,
            duration: 0.55,
            ease: "steps(1)",
            repeat: -1,
            yoyo: true,
          })
        );

        loops.forEach((loop) => loop.pause());

        ScrollTrigger.create({
          id: "manifesto-loops",
          trigger: rootRef.current,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) =>
            loops.forEach((loop) =>
              self.isActive && !document.hidden
                ? loop.play()
                : loop.pause()
            ),
        });
      }

      return () => split.revert();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="manifesto"
      className={`${styles.root} theme-graphite relative bg-black`}
    >
      <div className="relative flex min-h-screen flex-col justify-center overflow-hidden py-[12vh]">
        <span
          aria-hidden
          className={`${styles.glow} pointer-events-none absolute inset-0 z-0`}
        />

        <span
          ref={ghostRef}
          aria-hidden
          className={`${styles.ghost} pointer-events-none absolute -right-[6vw] top-[7vh] z-0 hidden lg:block`}
        >
          {MANIFESTO_COPY.ghost}
        </span>

        <span
          aria-hidden
          className={`${styles.sideNote} pointer-events-none absolute right-2 top-[22vh] z-10 hidden xl:block`}
        >
          {MANIFESTO_COPY.aside}
        </span>

        <div className="relative z-10 px-gutter">
          <div className="manifesto-meta flex items-center gap-4">
            <span className="h-px w-12 bg-blood-accent" />
            <span className={styles.outerEyebrow}>
              {MANIFESTO_COPY.eyebrow}
            </span>
          </div>
        </div>

        <div className="relative z-10 mt-[5vh] flex gap-6 px-gutter sm:gap-10">
          <div className="hidden shrink-0 flex-col items-center gap-4 sm:flex">
            <span className="block h-[40vh] w-px bg-bone-white/15">
              <span
                ref={spineRef}
                className={`${styles.spineFill} block h-full w-full bg-blood-accent`}
              />
            </span>

            <span className={styles.progress}>
              {MANIFESTO_COPY.progress}
            </span>
          </div>

          <div
            className={`${styles.sheet} theme-light relative w-full max-w-[66rem] px-[6vw] py-[5vh] lg:ml-[3%] lg:px-[4.3vw]`}
          >
            <span aria-hidden className={styles.paperRule} />

            <div className="manifesto-meta mb-7 flex items-center gap-3">
              <span className={styles.folio}>
                {MANIFESTO_COPY.sheetRef}
              </span>

              <span className={styles.folioRule} />

              <span className={styles.folioNumber}>
                SS—03
              </span>
            </div>

            {/* ONE CONTINUOUS PARAGRAPH */}
            <p
              className={`manifesto-paragraph ${styles.creedParagraph}`}
            >
              {MANIFESTO_COPY.lines.join(" ")}
            </p>

            {/* SEPARATE TYPOGRAPHY */}
            <p
              className={`manifesto-verdict ${styles.verdict}`}
            >
              {MANIFESTO_COPY.verdict}
              <span
                aria-hidden
                className={`${styles.caret} manifesto-caret`}
              />
            </p>

            <div className="manifesto-meta mt-7 flex items-center gap-5">
              <span className={styles.signRule} />

              <span className={styles.sign}>
                {MANIFESTO_COPY.sign}
              </span>
            </div>
          </div>
        </div>

        <span
          aria-hidden
          className={`${styles.stamp} manifesto-stamp pointer-events-none absolute bottom-[7vh] right-[5vw] z-10 hidden md:block`}
        >
          {MANIFESTO_COPY.stamp}
        </span>
      </div>
    </section>
  );
}
