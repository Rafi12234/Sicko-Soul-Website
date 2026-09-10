"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE, STAGGER } from "@/styles/theme";
import type { Statement, StatementFace, StatementTone } from "@/data/statements";
import styles from "./StatementBand.module.css";

const FACE: Record<StatementFace, string> = {
  display: "font-display",
  gothic: "font-gothic",
  blackletter: "font-blackletter",
  script: "font-script",
  spray: "font-spray",
};

const TONE: Record<StatementTone, string> = {
  bone: "text-bone-white",
  blood: "text-blood-accent",
  outline: styles.outline,
  outlineBlood: styles.outlineBlood,
};

/* Paper at rest, blood-black once the band has been read through. Tokens are
   lerped per channel because GSAP cannot tween a bare "r g b" custom property. */
const STOCK_START = {
  bg: [222, 217, 206],
  surface: [208, 203, 191],
  fg: [20, 20, 19],
  muted: [106, 103, 96],
} as const;

const STOCK_END = {
  bg: [20, 6, 6],
  surface: [34, 10, 10],
  fg: [242, 240, 235],
  muted: [150, 138, 138],
} as const;

export default function StatementBand({ statement }: { statement: Statement }) {
  const rootRef = useRef<HTMLElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const sheenRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      const split = new SplitText(".band-line-one", { type: "chars" });

      const intro = gsap.timeline({
        scrollTrigger: {
          id: `band-${statement.id}`,
          trigger: rootRef.current,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(".band-meta", { autoAlpha: 0, x: -24, duration: 0.7, ease: EASE.hard })
        // Line one is struck onto the wall character by character.
        .from(
          split.chars,
          {
            yPercent: 118,
            autoAlpha: 0,
            rotate: -6,
            duration: 1,
            stagger: STAGGER.chars,
            ease: EASE.expo,
          },
          "-=0.45",
        )
        // Line two is written across in one stroke, in a different hand.
        .from(
          ".band-line-two",
          { clipPath: "inset(0 100% 0 0)", duration: 1.1, ease: EASE.expo },
          "-=0.6",
        )
        .to(".band-rule", { scaleX: 1, duration: 0.9, ease: EASE.expo }, "-=0.75");

      /* ---- Stock change: the sheet darkens as it is read through. ---- */
      if (statement.theme === "shift") {
        const root = rootRef.current;
        const progress = { t: 0 };

        const paint = () => {
          if (!root) return;
          (Object.keys(STOCK_START) as Array<keyof typeof STOCK_START>).forEach((token) => {
            const from = STOCK_START[token];
            const to = STOCK_END[token];
            const channels = from
              .map((c, i) => Math.round(c + (to[i] - c) * progress.t))
              .join(" ");
            root.style.setProperty(`--c-${token}`, channels);
          });
        };

        paint();
        gsap.to(progress, {
          t: 1,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: {
            id: `band-stock-${statement.id}`,
            trigger: root,
            start: "top 75%",
            end: "bottom 45%",
            scrub: 0.6,
          },
        });
      }

      /* ---- Ghost drifts against the scroll for the length of the band. ---- */
      mm.add("(min-width: 768px)", () => {        gsap.fromTo(
          ghostRef.current,
          { yPercent: 12, xPercent: -3 },
          {
            yPercent: -12,
            xPercent: 3,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });

      /* ---- Continuous layer, parked until the band is on screen. ---- */
      const loops: gsap.core.Animation[] = [];

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        loops.push(
          gsap.fromTo(
            sheenRef.current,
            { xPercent: -130 },
            { xPercent: 130, duration: 5.5, ease: "none", repeat: -1, repeatDelay: 3.2 },
          ),
          gsap.to(".band-line-two", {
            rotate: 1.4,
            duration: 5,
            ease: "sine.inOut",
            repeat: -1,
            yoyo: true,
            transformOrigin: "left center",
          }),
          gsap
            .timeline({ repeat: -1, repeatDelay: 4.4 })
            .to(".band-line-one", { autoAlpha: 0.35, duration: 0.06, ease: "none" })
            .to(".band-line-one", { autoAlpha: 1, duration: 0.09, ease: "none" })
            .to(".band-line-one", { autoAlpha: 0.6, duration: 0.05, ease: "none" })
            .to(".band-line-one", { autoAlpha: 1, duration: 0.14, ease: "none" }),
        );
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((l) => (self.isActive ? l.play() : l.pause())),
      });

      return () => split.revert();
    }, rootRef);

    return () => ctx.revert();
  }, [statement]);

  const { lineOne, lineTwo } = statement;
  const stock =
    statement.theme === "light" || statement.theme === "shift"
      ? "theme-light"
      : statement.theme === "blood"
        ? "theme-blood"
        : "";
  // On blood stock the accent is the background, so the rule reads as paper.
  const ruleClass = statement.theme === "blood" ? "bg-bone-white/70" : "bg-blood-accent";

  return (
    <section
      ref={rootRef}
      aria-label={`${lineOne.text} ${lineTwo.text}`}
      className={`${styles.band} ${stock} bg-black py-[17vh]`}
    >
      <span
        ref={sheenRef}
        aria-hidden
        className={`${styles.sheen} pointer-events-none absolute inset-y-0 left-0 z-0 w-[45%]`}
      />

      <span
        ref={ghostRef}
        aria-hidden
        className={`${styles.ghost} pointer-events-none absolute right-[3vw] top-1/2 z-0 hidden -translate-y-1/2 font-blackletter text-[16vw] leading-none text-outline-2 opacity-[0.06] lg:block`}
      >
        {statement.ghost}
      </span>

      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 font-stencil text-[0.55rem] tracking-stencil text-concrete-gray/50 xl:block`}
      >
        {statement.edge}
      </span>

      <div className="relative z-10 px-gutter">
        <div className="band-meta flex items-center gap-4">
          <span className={`h-px w-12 ${ruleClass}`} />
          <span className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
            {statement.eyebrow}
          </span>
        </div>

        <div className="mt-[4vh]">
          <span className="split-mask block pb-[0.08em]">
            <span
              className={`band-line-one block font-display text-display leading-[0.86] ${
                FACE[lineOne.face]
              } ${TONE[lineOne.tone]} ${lineOne.distress ? "text-distress" : ""}`}
            >
              {lineOne.text}
            </span>
          </span>

          {/* Second line answers in another hand, pushed off the first's axis. */}
          <span className={`block overflow-hidden pb-[0.12em] ${lineTwo.indent ?? ""}`}>
            <span
              className={`${styles.lineTwo} band-line-two block whitespace-nowrap leading-[0.86] ${
                FACE[lineTwo.face]
              } ${TONE[lineTwo.tone]} ${
                lineTwo.face === "script"
                  ? "text-[clamp(2.6rem,8vw,7rem)] -mt-[0.06em]"
                  : "text-display -mt-[0.1em]"
              }`}
            >
              {lineTwo.text}
            </span>
          </span>

          <span
            className={`${styles.rule} band-rule mt-[3vh] block h-px w-full max-w-[44rem] ${ruleClass}`}
          />
        </div>
      </div>
    </section>
  );
}
