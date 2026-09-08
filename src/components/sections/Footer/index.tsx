"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { COLOR, EASE } from "@/styles/theme";
import { FOOTER_COPY } from "@/data/footer";
import styles from "./Footer.module.css";

export default function Footer() {
  const rootRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();
      const letters = q(".footer-letter");

      /* ---- Wordmark rises out of the floor on scrub. ---- */
      gsap.fromTo(
        letters,
        { yPercent: 116, autoAlpha: 0, rotate: 4 },
        {
          yPercent: 0,
          autoAlpha: 1,
          rotate: 0,
          duration: 1,
          stagger: 0.045,
          ease: EASE.expo,
          scrollTrigger: {
            id: "footer-wordmark",
            trigger: ".footer-outro",
            start: "top 92%",
            toggleActions: "play none none reverse",
          },
        },
      );

      gsap.from(q(".footer-col"), {
        autoAlpha: 0,
        y: 26,
        duration: 0.85,
        stagger: 0.09,
        ease: EASE.expo,
        scrollTrigger: {
          id: "footer-cols",
          trigger: ".footer-grid",
          start: "top 88%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Links: solid copy wipes across the hollow one. ---- */
      const linkCleanups = q(".footer-link").map((link) => {
        const fill = link.querySelector<HTMLElement>(".footer-link-fill");
        const arrow = link.querySelector<HTMLElement>(".footer-link-arrow");

        const onOver = () => {
          gsap.to(fill, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.5,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(arrow, {
            x: 6,
            autoAlpha: 1,
            duration: 0.45,
            ease: EASE.expo,
            overwrite: "auto",
          });
        };
        const onOut = () => {
          gsap.to(fill, {
            clipPath: "inset(0 100% 0 0)",
            duration: 0.35,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(arrow, {
            x: -4,
            autoAlpha: 0,
            duration: 0.3,
            ease: EASE.inOut,
            overwrite: "auto",
          });
        };

        link.addEventListener("pointerenter", onOver);
        link.addEventListener("pointerleave", onOut);
        return () => {
          link.removeEventListener("pointerenter", onOver);
          link.removeEventListener("pointerleave", onOut);
        };
      });

      /* ---- Continuous layer, parked until the footer is on screen. ---- */
      const loops: gsap.core.Animation[] = [];

      const tickerTrack = q(".footer-ticker-track")[0] as HTMLElement | undefined;
      if (tickerTrack) {
        const half = tickerTrack.scrollWidth / 2;
        loops.push(
          gsap.fromTo(
            tickerTrack,
            { x: -half },
            { x: 0, duration: 24, ease: EASE.loop, repeat: -1 },
          ),
        );
      }

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Random letters drop out of register, then snap back.
        const jitter = gsap.to(letters, {
          yPercent: () => gsap.utils.random(-9, 9),
          xPercent: () => gsap.utils.random(-2, 2),
          skewX: () => gsap.utils.random(-6, 6),
          autoAlpha: () => gsap.utils.random(0.55, 1),
          duration: 0.09,
          ease: "none",
          repeat: -1,
          repeatRefresh: true,
          repeatDelay: 2.9,
          yoyo: true,
          stagger: { each: 0.035, from: "random" },
        });

        const clock = gsap.timeline({ repeat: -1, repeatDelay: 2.4 }).to(clockRef.current, {
          duration: 0.7,
          ease: "power2.inOut",
          scrambleText: { text: FOOTER_COPY.built, chars: "upperCase", speed: 0.8 },
        });

        loops.push(jitter, clock);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "footer-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      /* ---- Wordmark lifts as the page bottoms out. Vertical only: any
         horizontal drift would push the outer letters off the edge. ---- */
      mm.add("(min-width: 768px)", () => {
        gsap.fromTo(
          wordmarkRef.current,
          { yPercent: 6 },
          {
            yPercent: 0,
            ease: "none",
            scrollTrigger: {
              id: "footer-drift",
              trigger: ".footer-outro",
              start: "top bottom",
              end: "bottom bottom",
              scrub: true,
            },
          },
        );
      });

      /* ---- Back to top. ---- */
      const topBtn = q(".footer-top")[0] as HTMLElement | undefined;
      const onTop = () => {
        gsap.to(window, { scrollTo: 0, duration: 1.6, ease: EASE.inOut });
      };
      const onTopOver = () => {
        gsap.to(".footer-top-arrow", { y: -6, duration: 0.4, ease: EASE.overshoot });
        gsap.to(".footer-top-label", { color: COLOR.bloodAccent, duration: 0.3 });
      };
      const onTopOut = () => {
        gsap.to(".footer-top-arrow", { y: 0, duration: 0.35, ease: EASE.inOut });
        gsap.to(".footer-top-label", { color: COLOR.boneWhite, duration: 0.3 });
      };
      topBtn?.addEventListener("pointerenter", onTopOver);
      topBtn?.addEventListener("pointerleave", onTopOut);
      topBtn?.addEventListener("click", onTop);

      return () => {
        linkCleanups.forEach((fn) => fn());
        topBtn?.removeEventListener("pointerenter", onTopOver);
        topBtn?.removeEventListener("pointerleave", onTopOut);
        topBtn?.removeEventListener("click", onTop);
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <footer ref={rootRef} className="relative overflow-hidden bg-black pt-[12vh]">
      <span
        aria-hidden
        className={`${styles.floor} pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42vh]`}
      />

      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-[10vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {FOOTER_COPY.eyebrow}
      </span>

      {/* Ticker runs against the hero strip at the top of the page. */}
      <div className="relative z-10 overflow-hidden border-y border-bone-white/12 py-3">
        <div className={`${styles.tickerTrack} footer-ticker-track`}>
          {[0, 1].map((copy) => (
            <span
              key={copy}
              aria-hidden={copy === 1}
              className="whitespace-nowrap font-stencil text-[0.6rem] tracking-stencil text-concrete-gray"
            >
              {FOOTER_COPY.ticker.repeat(8)}
            </span>
          ))}
        </div>
      </div>

      {/* ── Directory ────────────────────────────────────────────────── */}
      <div className="footer-grid relative z-10 mt-[9vh] grid grid-cols-2 gap-x-8 gap-y-12 px-gutter lg:grid-cols-4">
        <div className="footer-col col-span-2 lg:col-span-1">
          <p className="max-w-[24ch] font-display text-[clamp(1.1rem,1.9vw,1.6rem)] uppercase leading-[1.1] tracking-crushed text-bone-white">
            {FOOTER_COPY.rights}
          </p>
          <button
            type="button"
            className="footer-top mt-8 flex items-center gap-3"
            aria-label={FOOTER_COPY.toTop}
          >
            <span className="footer-top-arrow block font-stencil text-[0.8rem] text-blood-accent">
              ↑
            </span>
            <span className="footer-top-label font-stencil text-[0.55rem] tracking-stencil text-bone-white">
              {FOOTER_COPY.toTop}
            </span>
          </button>
        </div>

        {FOOTER_COPY.columns.map((column) => (
          <nav key={column.id} className="footer-col" aria-label={column.title}>
            <div className="flex items-center gap-3">
              <span className="h-px w-6 bg-blood-accent" />
              <p className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
                {column.title}
              </p>
            </div>

            <ul className="mt-6 space-y-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="footer-link relative flex items-center gap-2 py-1"
                  >
                    <span className="relative block">
                      <span className="block font-display text-[clamp(1rem,1.5vw,1.35rem)] uppercase tracking-crushed text-concrete-gray">
                        {link.label}
                      </span>
                      {/* Solid duplicate wipes across the muted one. */}
                      <span
                        aria-hidden
                        className={`${styles.linkFill} footer-link-fill absolute inset-0 block font-display text-[clamp(1rem,1.5vw,1.35rem)] uppercase tracking-crushed text-bone-white`}
                      >
                        {link.label}
                      </span>
                    </span>
                    <span
                      aria-hidden
                      className="footer-link-arrow block font-stencil text-[0.6rem] text-blood-accent opacity-0"
                    >
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      {/* ── Outro wordmark ───────────────────────────────────────────── */}
      <div className="footer-outro relative z-10 mt-[11vh]">
        <div className="flex items-end justify-between gap-6 px-gutter pb-6">
          <span ref={clockRef} className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
            {FOOTER_COPY.built}
          </span>
          <span className="h-px flex-1 bg-bone-white/10" />
          <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
            {FOOTER_COPY.eyebrow}
          </span>
        </div>

        <div className="overflow-hidden">
          <div
            ref={wordmarkRef}
            aria-label={FOOTER_COPY.wordmark}
            className={`${styles.wordmark} text-distress font-display text-[23vw] leading-[0.78] text-bone-white`}
          >
            {FOOTER_COPY.wordmark.split("").map((char, i) => (
              <span
                key={`${char}-${i}`}
                aria-hidden
                className={`${styles.letter} footer-letter`}
              >
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
