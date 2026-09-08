"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { CRED_COPY, CRED_ROWS } from "@/data/cred";
import styles from "./Cred.module.css";

/** Base travel per row in px/sec. Odd rows run backwards. */
const ROW_SPEED = [58, 44, 70];

export default function Cred() {
  const rootRef = useRef<HTMLElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      /* ---- Masthead. ---- */
      const headingSplit = new SplitText(".cred-heading", { type: "chars" });
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "cred-intro",
          trigger: rootRef.current,
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: 115,
          autoAlpha: 0,
          rotate: -5,
          duration: 1,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".cred-script",
          { autoAlpha: 0, scale: 0.8, rotate: -12, duration: 0.9, ease: EASE.overshoot },
          "-=0.55",
        )
        .from(
          ".cred-meta",
          { autoAlpha: 0, y: 20, duration: 0.7, stagger: 0.07, ease: EASE.hard },
          "-=0.6",
        );

      /* ---- Rows drop in as a wall, not one plate at a time. ---- */
      gsap.from(q(".cred-row"), {
        autoAlpha: 0,
        yPercent: 26,
        duration: 1.1,
        stagger: 0.14,
        ease: EASE.expo,
        scrollTrigger: {
          id: "cred-rows",
          trigger: ".cred-wall",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Plate hover: invert to bone, retract the redaction bar. ---- */
      const plateCleanups = q(".cred-plate").map((plate) => {
        const bar = plate.querySelector<HTMLElement>(".cred-redact-bar");
        const ink = gsap.utils.toArray<HTMLElement>(".cred-ink", plate);
        const dim = gsap.utils.toArray<HTMLElement>(".cred-dim", plate);
        const seal = plate.querySelector<HTMLElement>(".cred-seal");

        const onOver = () => {
          gsap.to(plate, {
            backgroundColor: COLOR.boneWhite,
            borderColor: COLOR.boneWhite,
            scale: 1.04,
            duration: 0.45,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(ink, { color: COLOR.black, duration: 0.3, overwrite: "auto" });
          gsap.to(dim, { color: "rgba(10,10,10,0.55)", duration: 0.3, overwrite: "auto" });
          gsap.to(bar, {
            scaleX: 0,
            duration: 0.55,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(seal, {
            autoAlpha: 1,
            rotate: -11,
            scale: 1,
            duration: 0.4,
            ease: EASE.overshoot,
            overwrite: "auto",
          });
        };

        const onOut = () => {
          gsap.to(plate, {
            backgroundColor: "rgba(20,20,20,0.86)",
            borderColor: "rgba(242,240,235,0.14)",
            scale: 1,
            duration: 0.5,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(ink, { color: COLOR.boneWhite, duration: 0.35, overwrite: "auto" });
          gsap.to(dim, { color: COLOR.concreteGray, duration: 0.35, overwrite: "auto" });
          gsap.to(bar, { scaleX: 1, duration: 0.4, ease: EASE.inOut, overwrite: "auto" });
          gsap.to(seal, {
            autoAlpha: 0,
            rotate: -22,
            scale: 0.7,
            duration: 0.3,
            ease: EASE.inOut,
            overwrite: "auto",
          });
        };

        plate.addEventListener("pointerenter", onOver);
        plate.addEventListener("pointerleave", onOut);
        return () => {
          plate.removeEventListener("pointerenter", onOver);
          plate.removeEventListener("pointerleave", onOut);
        };
      });

      /* ---- The wall itself. Hand-driven ticker, never a CSS animation, so
         scroll velocity can drive both its speed and its direction. ---- */
      type Lane = {
        track: HTMLElement;
        half: number;
        base: number;
        dir: number;
        offset: number;
        /** Eased toward 0.08 while the pointer holds the row. */
        hold: number;
        target: number;
      };

      const lanes: Lane[] = [];
      const laneCleanups: Array<() => void> = [];

      q(".cred-track").forEach((track, i) => {
        // Content is rendered twice, so wrapping at half the width is seamless.
        const half = track.scrollWidth / 2;
        if (!half) return;

        const lane: Lane = {
          track: track as HTMLElement,
          half,
          base: ROW_SPEED[i % ROW_SPEED.length],
          dir: i % 2 === 0 ? -1 : 1,
          offset: i % 2 === 0 ? 0 : -half,
          hold: 1,
          target: 1,
        };
        lanes.push(lane);

        const row = track.parentElement;
        const onEnter = () => {
          lane.target = 0.08;
        };
        const onLeave = () => {
          lane.target = 1;
        };
        row?.addEventListener("pointerenter", onEnter);
        row?.addEventListener("pointerleave", onLeave);
        laneCleanups.push(() => {
          row?.removeEventListener("pointerenter", onEnter);
          row?.removeEventListener("pointerleave", onLeave);
        });
      });

      let velocity = 0;
      const setters = lanes.map((lane) => gsap.quickSetter(lane.track, "x", "px"));

      const tick = (_time: number, deltaMs: number) => {
        const dt = Math.min(deltaMs, 50) / 1000;
        // Scroll energy decays so the wall coasts back to its idle speed.
        velocity *= 0.92;
        const boost = 1 + Math.min(7, Math.abs(velocity) / 320);
        // Scrolling up drags the whole wall the other way.
        const flip = velocity < -40 ? -1 : 1;

        lanes.forEach((lane, i) => {
          lane.hold += (lane.target - lane.hold) * Math.min(1, dt * 6);
          lane.offset += lane.dir * flip * lane.base * boost * lane.hold * dt;

          if (lane.offset <= -lane.half) lane.offset += lane.half;
          else if (lane.offset > 0) lane.offset -= lane.half;

          setters[i](lane.offset);
        });
      };

      let running = false;
      const start = () => {
        if (running) return;
        running = true;
        gsap.ticker.add(tick);
      };
      const stop = () => {
        if (!running) return;
        running = false;
        gsap.ticker.remove(tick);
      };

      ScrollTrigger.create({
        id: "cred-wall",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          velocity = self.getVelocity();
        },
        onToggle: (self) => (self.isActive ? start() : stop()),
      });

      /* ---- Tape crawls the opposite way to the row beneath it. ---- */
      const tapeTrack = q(".cred-tape-track")[0] as HTMLElement | undefined;
      let tapeLoop: gsap.core.Tween | null = null;
      if (tapeTrack) {
        const tapeHalf = tapeTrack.scrollWidth / 2;
        tapeLoop = gsap.fromTo(
          tapeTrack,
          { x: -tapeHalf },
          { x: 0, duration: 26, ease: EASE.loop, repeat: -1 },
        );
      }

      /* ---- Continuous layer, parked until the section is on screen. ---- */
      const loops: gsap.core.Animation[] = [];
      if (tapeLoop) loops.push(tapeLoop);

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const countLoop = gsap.timeline({ repeat: -1, repeatDelay: 5.5 }).to(counterRef.current, {
          duration: 0.9,
          ease: "power2.inOut",
          scrambleText: {
            text: CRED_COPY.counter.value,
            chars: CRED_COPY.counter.chars,
            speed: 0.9,
          },
        });

        const dotBlink = gsap.to(".cred-live-dot", {
          autoAlpha: 0.15,
          duration: 0.5,
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true,
        });

        loops.push(countLoop, dotBlink);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "cred-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      const onResize = () => {
        lanes.forEach((lane) => {
          lane.half = lane.track.scrollWidth / 2;
        });
      };
      window.addEventListener("resize", onResize);

      return () => {
        stop();
        headingSplit.revert();
        plateCleanups.forEach((fn) => fn());
        laneCleanups.forEach((fn) => fn());
        window.removeEventListener("resize", onResize);
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="street-cred"
      className="relative overflow-hidden bg-black pb-[13vh] pt-[13vh]"
    >
      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute right-2 top-[26vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {CRED_COPY.aside}
      </span>

      {/* ── Masthead ─────────────────────────────────────────────────── */}
      <div className="relative z-10 px-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="cred-meta flex items-center gap-4">
            <span className="cred-live-dot block h-[7px] w-[7px] bg-blood-accent" />
            <span className="font-stencil text-stamp text-concrete-gray">{CRED_COPY.eyebrow}</span>
          </div>
          <span className="cred-meta border border-bone-white/25 px-3 py-2 font-stencil text-[0.55rem] tracking-stencil text-bone-white">
            {CRED_COPY.stamp}
          </span>
        </div>

        {/* Display word and brush script share a baseline and overlap. */}
        <div className="relative mt-[4vh] flex flex-wrap items-end gap-x-5">
          <h2 className="split-mask block pb-[0.08em]">
            <span className="cred-heading text-distress block font-display text-display-xl leading-[0.82] text-bone-white">
              {CRED_COPY.heading}
            </span>
          </h2>
          <span className="cred-script -ml-1 block pb-[0.12em] font-script text-[clamp(2.4rem,6.5vw,5.5rem)] leading-[0.8] text-blood-accent sm:-ml-4">
            {CRED_COPY.headingScript}
          </span>
        </div>

        <div className="cred-meta mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span ref={counterRef} className="font-display text-[1.5rem] leading-none tracking-crushed text-bone-white">
            {CRED_COPY.counter.value}
          </span>
          <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
            {CRED_COPY.counter.label}
          </span>
          <span className="hidden h-px flex-1 bg-bone-white/12 sm:block" />
          <span className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
            {CRED_COPY.hint}
          </span>
        </div>
      </div>

      {/* ── The wall ─────────────────────────────────────────────────── */}
      <div className="cred-wall relative z-10 mt-[7vh]">
        {CRED_ROWS.map((row, rowIndex) => (
          <div key={rowIndex} className="cred-row relative overflow-hidden py-2.5">
            <div className={`${styles.track} cred-track gap-5`}>
              {/* Rendered twice so the ticker can wrap at half the width. */}
              {[...row, ...row].map((statement, i) => (
                <article
                  key={`${statement.id}-${i}`}
                  aria-hidden={i >= row.length}
                  className={`${styles.plate} cred-plate relative flex w-[74vw] shrink-0 flex-col justify-between border border-bone-white/14 bg-off-black/85 p-6 sm:w-[52vw] md:w-[30vw] lg:w-[23vw]`}
                  data-cursor="hover"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="cred-dim font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
                      {statement.case}
                    </span>
                    <span
                      aria-hidden
                      className="cred-seal border border-blood-accent px-2 py-[0.2rem] font-stencil text-[0.42rem] tracking-stencil text-blood-accent opacity-0"
                    >
                      {CRED_COPY.verdict}
                    </span>
                  </div>

                  <blockquote className="mt-6">
                    <p className="cred-ink font-display text-[clamp(1.05rem,1.5vw,1.4rem)] uppercase leading-[1.15] tracking-crushed text-bone-white">
                      {statement.quote}
                    </p>

                    {/* Second clause stays blacked out until the plate is held. */}
                    <span className="relative mt-2 inline-block">
                      <span className="cred-ink font-display text-[clamp(1.05rem,1.5vw,1.4rem)] uppercase leading-[1.15] tracking-crushed text-bone-white">
                        {statement.redacted}
                      </span>
                      <span
                        aria-hidden
                        className={`${styles.redactBar} cred-redact-bar absolute -inset-x-1 -inset-y-0.5 block border-l-2 border-blood-accent bg-black`}
                      />
                    </span>
                  </blockquote>

                  <div className="mt-7">
                    <span className="block h-px w-full bg-bone-white/12" />
                    <div className="mt-3 flex items-baseline justify-between gap-3">
                      <span className="cred-ink font-stencil text-[0.55rem] tracking-stencil text-bone-white">
                        {statement.name}
                      </span>
                      <span className="cred-dim font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">
                        {statement.handle}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

        {/* Tape cuts the wall and inverts every plate that passes under it. */}
        <div
          className={`${styles.tape} pointer-events-none absolute left-1/2 top-1/2 z-20 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-2 overflow-hidden border-y border-bone-white/40 bg-bone-white/5 py-2`}
        >
          <div className={`${styles.tapeTrack} cred-tape-track`}>
            {[0, 1].map((copy) => (
              <span
                key={copy}
                aria-hidden={copy === 1}
                className="whitespace-nowrap font-stencil text-[0.62rem] tracking-stencil text-bone-white"
              >
                {CRED_COPY.tape.repeat(6)}
              </span>
            ))}
          </div>
        </div>

        <span
          aria-hidden
          className={`${styles.fadeLeft} pointer-events-none absolute inset-y-0 left-0 z-20 w-[14vw]`}
        />
        <span
          aria-hidden
          className={`${styles.fadeRight} pointer-events-none absolute inset-y-0 right-0 z-20 w-[14vw]`}
        />
      </div>

      {/* ── Ledger ───────────────────────────────────────────────────── */}
      <div className="relative z-10 mt-[8vh] px-gutter">
        <div className="hairline" />
        <div className="mt-6 grid grid-cols-3 gap-4">
          {CRED_COPY.stats.map((stat) => (
            <div key={stat.label} className="cred-meta">
              <p className="font-display text-[clamp(1.5rem,3vw,2.6rem)] leading-none tracking-crushed text-bone-white">
                {stat.value}
              </p>
              <p className="mt-3 font-stencil text-[0.5rem] leading-relaxed tracking-stencil text-concrete-gray">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
