"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { gsap } from "@/lib/gsap";
import { COLOR, EASE } from "@/styles/theme";
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
  const accessRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const breachRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const idleTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const restoreScrollRef = useRef<() => void>(() => {});

  const [ready, setReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useLayoutEffect(() => {
    if (useAppStore.getState().hasEntered) {
      setDismissed(true);
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    const previousOverflow = document.body.style.overflow;
    let restored = false;

    const restoreScroll = () => {
      if (restored) return;
      restored = true;
      document.body.style.overflow = previousOverflow;
    };

    restoreScrollRef.current = restoreScroll;
    document.body.style.overflow = "hidden";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.35 : 1;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const counter = { value: 0 };
      const chars = q(".pre-core-char");

      gsap.set(chars, {
        autoAlpha: 0,
        x: () => gsap.utils.random(-260, 260),
        y: () => gsap.utils.random(-170, 170),
        rotate: () => gsap.utils.random(-70, 70),
        scale: () => gsap.utils.random(0.3, 2.1),
      });

      gsap.set(".pre-core-rule", { scaleX: 0 });
      gsap.set(".pre-core-ghost", { autoAlpha: 0, x: 0 });
      gsap.set(accessRef.current, { autoAlpha: 0, y: 34, pointerEvents: "none" });
      gsap.set(".pre-access-line", { scaleX: 0 });
      gsap.set(".pre-access-copy", { yPercent: 115 });
      gsap.set(".pre-access-button", { y: 24, autoAlpha: 0 });
      gsap.set(breachRef.current, { scaleX: 0, autoAlpha: 1 });
      gsap.set(flashRef.current, { autoAlpha: 0 });

      const tl = gsap.timeline({ defaults: { ease: EASE.hard } });

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
            duration: 2.0 * scale,
            ease: "power2.inOut",
            snap: { value: 1 },
            onUpdate: () => {
              if (!counterRef.current) return;
              counterRef.current.textContent = String(Math.round(counter.value)).padStart(3, "0");
            },
            onComplete: () => {
              if (counterRef.current) counterRef.current.textContent = "100";
            },
          },
          0,
        )
        .fromTo(
          barRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 2.0 * scale, ease: "power2.inOut" },
          0,
        )
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
        .to(
          ".pre-core-ghost",
          {
            keyframes: [
              { autoAlpha: 0.9, x: -9, duration: 0.06 * scale },
              { autoAlpha: 0.5, x: 7, duration: 0.06 * scale },
              { autoAlpha: 0, x: 0, duration: 0.1 * scale },
            ],
            ease: "none",
          },
          1.28 * scale,
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
          1.34 * scale,
        )
        .to(
          statusRef.current,
          {
            duration: 0.45 * scale,
            ease: "power2.inOut",
            scrambleText: {
              text: PRELOADER_COPY.status[1],
              chars: "upperCase",
              speed: 0.9,
            },
          },
          0.72 * scale,
        )
        .to(
          statusRef.current,
          {
            duration: 0.45 * scale,
            ease: "power2.inOut",
            scrambleText: {
              text: PRELOADER_COPY.status[2],
              chars: "upperCase",
              speed: 0.9,
            },
          },
          1.56 * scale,
        )
        .addLabel("clearance", 2.03 * scale)
        .to(
          contentRef.current,
          { autoAlpha: 0.17, yPercent: -2, duration: 0.55 * scale, ease: EASE.expo },
          "clearance",
        )
        .to(
          coreRef.current,
          { autoAlpha: 0.1, scale: 0.82, duration: 0.55 * scale, ease: EASE.expo },
          "clearance",
        )
        .to(barRef.current, { autoAlpha: 0.25, duration: 0.35 * scale }, "clearance")
        .set(accessRef.current, { pointerEvents: "auto" }, "clearance+=0.03")
        .to(
          accessRef.current,
          { autoAlpha: 1, y: 0, duration: 0.62 * scale, ease: EASE.expo },
          "clearance+=0.03",
        )
        .to(
          ".pre-access-line",
          { scaleX: 1, duration: 0.7 * scale, stagger: 0.08 * scale, ease: EASE.expo },
          "clearance+=0.08",
        )
        .to(
          ".pre-access-copy",
          { yPercent: 0, duration: 0.62 * scale, stagger: 0.055 * scale, ease: EASE.expo },
          "clearance+=0.1",
        )
        .to(
          ".pre-access-button",
          { y: 0, autoAlpha: 1, duration: 0.55 * scale, ease: EASE.overshoot },
          "clearance+=0.2",
        )
        .add(() => {
          setReady(true);
          requestAnimationFrame(() => buttonRef.current?.focus({ preventScroll: true }));

          if (reducedMotion) return;

          idleTimelineRef.current = gsap
            .timeline({ repeat: -1, repeatDelay: 0.35 })
            .fromTo(
              ".pre-access-sweep",
              { xPercent: -135, autoAlpha: 0 },
              { xPercent: 135, autoAlpha: 0.75, duration: 1.15, ease: "power2.inOut" },
            )
            .to(".pre-access-sweep", { autoAlpha: 0, duration: 0.18 }, "-=0.16");
        }, "clearance+=0.58");
    }, rootRef);

    return () => {
      idleTimelineRef.current?.kill();
      exitTimelineRef.current?.kill();
      restoreScroll();
      ctx.revert();
    };
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!ready || entering || !buttonRef.current) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);

    gsap.to(buttonRef.current, {
      x: x * 0.045,
      y: y * 0.08,
      duration: 0.32,
      ease: EASE.expo,
      overwrite: "auto",
    });
  };

  const handlePointerLeave = () => {
    if (!buttonRef.current) return;

    gsap.to(buttonRef.current, {
      x: 0,
      y: 0,
      duration: 0.55,
      ease: EASE.expo,
      overwrite: "auto",
    });
  };

  const handleEnter = () => {
    if (!ready || entering) return;

    setEntering(true);
    idleTimelineRef.current?.kill();

    /**
     * CRITICAL: play() is called synchronously inside this real button click.
     * This is the same browser-unlock principle used by LoveOS's Enter action.
     */
    const audio = document.getElementById("sicko-soul-audio") as HTMLAudioElement | null;
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 1;
      void audio.play().catch(() => {
        // If a browser/device still refuses playback, entry must never be trapped.
      });
    }

    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scale = reducedMotion ? 0.45 : 1;

    exitTimelineRef.current = gsap
      .timeline({
        defaults: { ease: EASE.inOut },
        onComplete: () => {
          restoreScrollRef.current();
          useAppStore.getState().setHasEntered(true);
          setDismissed(true);
        },
      })
      .to(
        buttonRef.current,
        { scaleX: 0.985, scaleY: 0.9, duration: 0.12 * scale, ease: "power2.in" },
        0,
      )
      .to(
        ".pre-access-copy",
        {
          x: (index) => (index % 2 === 0 ? -36 : 36),
          autoAlpha: 0,
          duration: 0.28 * scale,
          stagger: 0.02 * scale,
          ease: "power3.in",
        },
        0.05 * scale,
      )
      .to(
        buttonRef.current,
        { autoAlpha: 0, scaleX: 1.08, duration: 0.24 * scale, ease: "power3.in" },
        0.08 * scale,
      )
      .to(
        breachRef.current,
        { scaleX: 1, duration: 0.2 * scale, ease: "power4.in" },
        0.12 * scale,
      )
      .to(
        flashRef.current,
        { autoAlpha: 0.8, duration: 0.045 * scale, ease: "none" },
        0.28 * scale,
      )
      .to(
        flashRef.current,
        { autoAlpha: 0, duration: 0.1 * scale, ease: "none" },
        0.325 * scale,
      )
      .to(
        breachRef.current,
        { height: "18px", backgroundColor: COLOR.bloodAccent, duration: 0.18 * scale, ease: "power4.out" },
        0.3 * scale,
      )
      .to(
        accessRef.current,
        { autoAlpha: 0, scale: 1.08, duration: 0.28 * scale, ease: "power3.in" },
        0.24 * scale,
      )
      .to(
        panelTopRef.current,
        { yPercent: -102, duration: 0.92 * scale, ease: EASE.inOut },
        0.42 * scale,
      )
      .to(
        panelBottomRef.current,
        { yPercent: 102, duration: 0.92 * scale, ease: EASE.inOut },
        0.42 * scale,
      )
      .to(
        breachRef.current,
        { autoAlpha: 0, scaleX: 0.15, duration: 0.42 * scale, ease: "power2.out" },
        0.48 * scale,
      )
      .to(root, { autoAlpha: 0, duration: 0.12 * scale }, 1.18 * scale);
  };

  if (dismissed) return null;

  return (
    <div
      ref={rootRef}
      className={`${styles.root} fixed inset-0 z-preloader overflow-hidden`}
      role="dialog"
      aria-modal="true"
      aria-label="Sicko Soul entry clearance"
    >
      <div ref={panelTopRef} className={`${styles.panel} ${styles.panelTop}`} />
      <div ref={panelBottomRef} className={`${styles.panel} ${styles.panelBottom}`} />

      <div className={styles.screenGrid} aria-hidden />
      <div className={styles.leftRail} aria-hidden>
        <span>SS / 001</span>
        <span>PRIVATE SIGNAL</span>
        <span>NO PUBLIC ACCESS</span>
      </div>
      <div className={styles.rightRail} aria-hidden>
        <span>34°00&apos;N</span>
        <span>FILE // ENTRY</span>
        <span>LIVE FEED</span>
      </div>

      <div
        ref={contentRef}
        className={`${styles.content} absolute inset-0 flex flex-col justify-between px-gutter py-gutter`}
      >
        <div className="flex items-start justify-between gap-8">
          <p className="font-stencil text-stamp text-concrete-gray">{PRELOADER_COPY.eyebrow}</p>
          <p className="font-stencil text-stamp text-blood-accent">{PRELOADER_COPY.tag}</p>
        </div>

        <div className="relative">
          <span
            ref={statusRef}
            className={`${styles.status} mb-4 block font-stencil text-stamp text-concrete-gray`}
          >
            {PRELOADER_COPY.status[0]}
          </span>

          <h1
            ref={wordmarkRef}
            className={`${styles.wordmark} text-distress -ml-gutter font-display text-display-xl leading-[0.85]`}
          >
            {PRELOADER_COPY.wordmarkCipher}
          </h1>

          <span
            ref={counterRef}
            className={`${styles.counter} pointer-events-none absolute -bottom-[0.06em] right-0 font-display text-hero leading-none mix-blend-difference`}
          >
            000
          </span>
        </div>
      </div>

      <div
        ref={coreRef}
        className={`${styles.core} pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-gutter`}
      >
        <div className="relative">
          <span
            aria-hidden
            className={`${styles.coreMark} pre-core-mark block font-gothic text-[clamp(2.6rem,7.5vw,6rem)] leading-none text-bone-white`}
          >
            {PRELOADER_COPY.core.mark.split("").map((char, index) => (
              <span key={`${char}-${index}`} className={`${styles.coreChar} pre-core-char`}>
                {char === " " ? "\u00A0" : char}
              </span>
            ))}
          </span>

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
          className={`${styles.sub} mt-5 block text-center font-stencil text-[0.58rem] tracking-stencil text-bone-white/75`}
        >
          {PRELOADER_COPY.core.subCipher}
        </span>
      </div>

      {/* Stage two: the loading UI mutates into an access seal instead of showing a generic Continue button. */}
      <div ref={accessRef} className={styles.accessGate}>
        <div className={`${styles.accessLine} pre-access-line`} aria-hidden />

        <div className={styles.accessMeta}>
          <div className={styles.accessMask}>
            <span className="pre-access-copy font-stencil">{PRELOADER_COPY.access.index}</span>
          </div>
          <div className={styles.accessMask}>
            <span className="pre-access-copy font-stencil">100 / 100 // {PRELOADER_COPY.access.status}</span>
          </div>
        </div>

        <div className={styles.accessTitle}>
          <div className={styles.accessMask}>
            <span className="pre-access-copy font-blackletter">{PRELOADER_COPY.access.titleTop}</span>
          </div>
          <div className={styles.accessMask}>
            <span className="pre-access-copy font-display">{PRELOADER_COPY.access.titleBottom}</span>
          </div>
        </div>

        <div className={`${styles.accessLine} pre-access-line`} aria-hidden />

        <div className={styles.accessInstruction}>
          <div className={styles.accessMask}>
            <p className="pre-access-copy font-stencil">{PRELOADER_COPY.access.note}</p>
          </div>
        </div>

        <button
          ref={buttonRef}
          type="button"
          disabled={!ready || entering}
          className={`${styles.accessButton} pre-access-button`}
          onClick={handleEnter}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          aria-label="Break the seal and enter Sicko Soul with sound"
        >
          <span className={`${styles.buttonSweep} pre-access-sweep`} aria-hidden />
          <span className={styles.buttonNoise} aria-hidden />
          <span className={styles.buttonIndex} aria-hidden>
            001
          </span>

          <span className={styles.buttonCopy}>
            <span className={`${styles.buttonLabel} font-display`}>{PRELOADER_COPY.access.button}</span>
            <span className={`${styles.buttonSub} font-stencil`}>{PRELOADER_COPY.access.buttonSub}</span>
          </span>

          <span className={styles.buttonArrow} aria-hidden>
            →
          </span>
          <span className={`${styles.buttonGhost} font-display`} aria-hidden>
            {PRELOADER_COPY.access.button}
          </span>
        </button>

        <div className={styles.accessFooter}>
          <div className={styles.accessMask}>
            <span className="pre-access-copy font-stencil">{PRELOADER_COPY.access.micro}</span>
          </div>
          <span className={styles.liveDot} aria-hidden />
        </div>
      </div>

      <div ref={breachRef} className={styles.breach} aria-hidden />
      <div ref={flashRef} className={styles.flash} aria-hidden />

      <div
        ref={barRef}
        className={`${styles.bar} pointer-events-none absolute inset-x-0 bottom-0 h-px bg-bone-white/70`}
      />
    </div>
  );
}
