"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE, STAGGER } from "@/styles/theme";
import { useAppStore } from "@/store/useAppStore";
import { HERO_COPY } from "@/data/hero";
import { HERO_POSTER, HERO_VIDEO, HERO_VIDEO_MOBILE, HERO_VIDEO_TABLET } from "@/lib/media";
import styles from "./Hero.module.css";

const formatTimecode = (totalSeconds: number) => {
  const s = Math.floor(totalSeconds);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

export default function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cycleRef = useRef<HTMLSpanElement>(null);
  const taglineRef = useRef<HTMLSpanElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLSpanElement>(null);
  const timecodeRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      /* ---- Entrance: chars rise out of their masks with a slight tilt. ---- */
      const split = new SplitText(".hero-line", { type: "chars" });

      const intro = gsap
        .timeline({ paused: true, defaults: { ease: EASE.expo } })
        .from(split.chars, {
          yPercent: 118,
          rotate: 6,
          autoAlpha: 0,
          duration: 1.15,
          stagger: STAGGER.chars,
        })
        .from(
          ".hero-knockout-edge",
          { autoAlpha: 0, duration: 0.8, ease: EASE.hard },
          "-=0.35",
        )
        .to(
          taglineRef.current,
          {
            duration: 1.1,
            ease: "power2.inOut",
            scrambleText: {
              text: HERO_COPY.tagline,
              chars: "upperCase",
              speed: 0.8,
              revealDelay: 0.2,
            },
          },
          "-=0.8",
        )
        .from(
          ".hero-edge",
          { autoAlpha: 0, x: 40, duration: 0.9, ease: EASE.hard },
          "-=1",
        )
        .from(".hero-eyebrow", { autoAlpha: 0, y: -12, duration: 0.6 }, "<")
        .from(".hero-rec", { autoAlpha: 0, y: -12, duration: 0.6 }, "<0.1")
        .from(".hero-strip", { autoAlpha: 0, y: 24, duration: 0.7 }, "-=0.5");

      // Hero holds until the Preloader panels have cleared. Ambient loops and
      // video are synchronized below so nothing expensive runs behind the gate.
      if (useAppStore.getState().hasEntered) intro.play();

      /* ---- Signature device: the middle word keeps rewriting itself. ---- */
      const cycleTl = gsap.timeline({ repeat: -1, delay: 2.4 });
      HERO_COPY.cycle.forEach((word) => {
        cycleTl
          .to(cycleRef.current, {
            duration: 0.9,
            ease: "power2.inOut",
            scrambleText: { text: word, chars: "upperCase", speed: 0.5, revealDelay: 0.25 },
          })
          .to({}, { duration: 1.8 });
      });

      /* ---- Chromatic tear: a blood ghost slices off the lockup periodically. */
      const glitch = gsap
        .timeline({ repeat: -1, repeatDelay: 3.4, defaults: { duration: 0.07, ease: "steps(2)" } })
        .set(".hero-ghost", { autoAlpha: 0.9 })
        .to(".hero-ghost", { x: -9, skewX: 7, clipPath: "inset(14% 0 56% 0)" })
        .to(".hero-ghost", { x: 8, skewX: -5, clipPath: "inset(64% 0 10% 0)" })
        .to(".hero-ghost", { x: -4, skewX: 2, clipPath: "inset(38% 0 40% 0)" })
        .to(".hero-ghost", { x: 5, skewX: 0, clipPath: "inset(4% 0 82% 0)" })
        .set(".hero-ghost", { autoAlpha: 0, x: 0, skewX: 0, clipPath: "inset(0% 0 0% 0)" });

      /* ---- Constant-speed GSAP marquee. Street Cred's velocity-reactive
              ticker stays distinct from this one. CSS keyframes are banned. */
      const marquee = gsap.to(marqueeRef.current, {
        xPercent: -50,
        duration: 26,
        ease: "none",
        repeat: -1,
      });

      /* ---- Second axis: the edge ticker climbs while the footer runs left. */
      const edge = gsap.to(edgeRef.current, {
        yPercent: -50,
        duration: 44,
        ease: "none",
        repeat: -1,
      });

      /* ---- Looping SCROLL rail. ---- */
      const rail = gsap
        .timeline({ repeat: -1 })
        .fromTo(
          railRef.current,
          { scaleY: 0, transformOrigin: "top center" },
          { scaleY: 1, duration: 1.1, ease: "power2.inOut" },
        )
        .to(railRef.current, {
          scaleY: 0,
          transformOrigin: "bottom center",
          duration: 1.1,
          ease: "power2.inOut",
        });

      /* ---- Surveillance timecode. Linear because it is a clock. ---- */
      const clock = { t: 0 };
      let lastSecond = -1;
      const timecode = gsap.to(clock, {
        t: 5999,
        duration: 5999,
        ease: "none",
        repeat: -1,
        onUpdate: () => {
          const second = Math.floor(clock.t);
          if (second === lastSecond || !timecodeRef.current) return;
          lastSecond = second;
          timecodeRef.current.textContent = formatTimecode(second);
        },
      });

      /* ---- Runtime lifecycle. Same visuals, zero invisible work. ---- */
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const ambient: gsap.core.Animation[] = prefersReducedMotion
        ? [marquee, edge]
        : [cycleTl, glitch, marquee, edge, rail, timecode];

      if (prefersReducedMotion) {
        marquee.timeScale(0.3);
        edge.timeScale(0.3);
        rail.pause(0);
        glitch.pause(0).progress(0);
        cycleTl.pause(0);
        timecode.pause();
      }

      ambient.forEach((animation) => animation.pause());

      let entered = useAppStore.getState().hasEntered;
      let sectionActive = false;

      const syncAmbient = () => {
        const active = entered && sectionActive && !document.hidden;
        ambient.forEach((animation) => (active ? animation.resume() : animation.pause()));

        const video = videoRef.current;
        if (!video) return;
        // Leave decoding completely idle outside the hero, while hidden,
        // or when the visitor requested less animation.
        const playVideo = active && !prefersReducedMotion;
        if (playVideo && video.paused) void video.play().catch(() => {});
        else if (!playVideo && !video.paused) video.pause();
      };

      const visibilityTrigger = ScrollTrigger.create({
        id: "hero-runtime",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          sectionActive = self.isActive;
          syncAmbient();
        },
        onRefresh: (self) => {
          sectionActive = self.isActive;
          syncAmbient();
        },
      });
      sectionActive = visibilityTrigger.isActive;
      document.addEventListener("visibilitychange", syncAmbient);
      syncAmbient();

      const unsubscribe = useAppStore.subscribe((state) => {
        if (!state.hasEntered || entered) return;
        entered = true;
        intro.play();
        syncAmbient();
      });

      // Scroll only the headline, never the full-screen filtered video.
      // Animating the video while it decodes forces large compositor updates
      // and causes scroll frame drops, especially on shared/mobile GPUs.
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(".hero-headline", {
          yPercent: -15,
          autoAlpha: 0.35,
          ease: "none",
          scrollTrigger: {
            id: "hero-headline-parallax",
            trigger: rootRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.35,
          },
        });
      });

      return () => {
        unsubscribe();
        document.removeEventListener("visibilitychange", syncAmbient);
        split.revert();
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative h-screen w-full overflow-hidden bg-black"
    >
      <div className={`${styles.videoWrap} absolute inset-0`}>
        <div className={`${styles.videoInner} absolute inset-0`}>
          <video
            ref={videoRef}
            className="media-treat h-full w-full object-cover"
            poster={HERO_POSTER}
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden
          >
            <source media="(max-width: 767px)" src={HERO_VIDEO_MOBILE} />
            <source media="(max-width: 1279px)" src={HERO_VIDEO_TABLET} />
            <source src={HERO_VIDEO} />
          </video>
        </div>
      </div>

      <div className={`${styles.vignette} pointer-events-none absolute inset-0`} />
      <div className={`${styles.scanlines} pointer-events-none absolute inset-0`} />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between px-gutter pt-28 lg:pr-32">
          <div className="hero-eyebrow flex items-center gap-4">
            <span className="h-px w-16 bg-blood-accent" />
            <p className="font-stencil text-stamp text-concrete-gray">{HERO_COPY.eyebrow}</p>
          </div>

          <div className="hero-rec flex items-center gap-3 font-stencil text-stamp text-bone-white/70">
            <span className="block h-2 w-2 bg-blood-accent" />
            <span>{HERO_COPY.rec}</span>
            <span ref={timecodeRef} className="tabular-nums">
              00:00:00
            </span>
          </div>
        </div>

        {/* Vertical hollow blackletter climbing the right edge — second motion
            axis, counter to the footer ticker. Bleeds off top and bottom. */}
        <div className="hero-edge pointer-events-none absolute right-0 top-0 hidden h-full overflow-hidden lg:block">
          <div ref={edgeRef} className="whitespace-nowrap [writing-mode:vertical-rl]">
            {[0, 1].map((pass) => (
              <span
                key={pass}
                aria-hidden
                className="text-outline font-gothic text-[clamp(3.5rem,7vw,7rem)] leading-none"
              >
                {HERO_COPY.edgeTicker.repeat(4)}
              </span>
            ))}
          </div>
        </div>

        <div className="hero-headline relative pb-[7vh]">
          <h1>
            {/* 1 — solid distressed slab, optically flush to the viewport edge */}
            <span className="split-mask relative block pb-[0.06em]">
              <span className="hero-line text-distress -ml-[0.03em] block font-display text-hero-slab text-bone-white">
                {HERO_COPY.lineOne}
              </span>
              <span
                aria-hidden
                className={`${styles.ghost} hero-ghost pointer-events-none absolute inset-0 opacity-0`}
              >
                <span className="-ml-[0.03em] block font-display text-hero-slab text-blood-accent">
                  {HERO_COPY.lineOne}
                </span>
              </span>
            </span>

            {/* 2 — hollow blackletter that rewrites itself, cutting across the slab above */}
            <span className="relative z-10 -mt-[0.3em] block pl-[30%]">
              <span
                ref={cycleRef}
                className="text-outline block font-gothic text-hero leading-[0.82]"
              >
                {HERO_COPY.cycleSeed}
              </span>
            </span>

            {/* 3 — solid display lettering directly over the uncovered footage */}
            <span className="relative -mt-[0.24em] block">
              <span className={`${styles.knockout} block px-gutter`}>
                <span
                  className={`${styles.knockoutText} hero-line block font-display text-hero-slab`}
                >
                  {HERO_COPY.lineThree}
                </span>
              </span>
              <span
                aria-hidden
                className="hero-knockout-edge pointer-events-none absolute inset-0 px-gutter"
              >
                <span className="text-outline block font-display text-hero-slab">
                  {HERO_COPY.lineThree}
                </span>
              </span>
            </span>
          </h1>

          <div className="mt-7 flex items-end justify-between gap-8 px-gutter lg:pr-32">
            <span ref={taglineRef} className="font-stencil text-stamp text-bone-white/80">
              {HERO_COPY.taglineCipher}
            </span>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="font-stencil text-stamp text-concrete-gray [writing-mode:vertical-rl]">
                {HERO_COPY.scroll}
              </span>
              <span className={`${styles.scrollRail} block h-16 w-px bg-bone-white/25`}>
                <span ref={railRef} className="block h-full w-full bg-blood-accent" />
              </span>
            </div>
          </div>
        </div>

        <div className="hero-strip border-y border-bone-white/15 bg-black/70 py-3">
          <div ref={marqueeRef} className={styles.marqueeTrack}>
            {[0, 1].map((pass) => (
              <div key={pass} className="flex shrink-0" aria-hidden={pass === 1}>
                {HERO_COPY.marquee.map((phrase) => (
                  <span
                    key={`${pass}-${phrase}`}
                    className="flex shrink-0 items-center gap-8 px-8 font-stencil text-stamp text-bone-white/70"
                  >
                    {phrase}
                    <span className="inline-block h-1 w-1 shrink-0 bg-blood-accent" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
