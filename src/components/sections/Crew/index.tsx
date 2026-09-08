"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { CREW_COPY } from "@/data/crew";
import styles from "./Crew.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Crew() {
  const rootRef = useRef<HTMLElement>(null);
  const watchRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const noticeRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  const [signed, setSigned] = useState(false);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      gsap.set(receiptRef.current, { autoAlpha: 0, yPercent: 30 });

      /* ---- Masthead. ---- */
      const headingSplit = new SplitText(".crew-heading", { type: "chars" });
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "crew-intro",
          trigger: rootRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: 120,
          autoAlpha: 0,
          rotate: 6,
          duration: 1.05,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".crew-heading-alt",
          { autoAlpha: 0, scale: 0.86, rotate: -8, duration: 0.95, ease: EASE.overshoot },
          "-=0.6",
        )
        .from(
          ".crew-meta",
          { autoAlpha: 0, y: 20, duration: 0.7, stagger: 0.08, ease: EASE.hard },
          "-=0.65",
        )
        .from(
          ".crew-form-row",
          { autoAlpha: 0, y: 26, duration: 0.85, stagger: 0.1, ease: EASE.expo },
          "-=0.5",
        );

      /* ---- Field focus floods the section deep red. ---- */
      const field = fieldRef.current;
      const onFocus = () => {
        gsap.to(watchRef.current, { autoAlpha: 1, duration: 1.1, ease: EASE.expo });
        gsap.to(ruleRef.current, { scaleX: 1, duration: 0.7, ease: EASE.expo });
        gsap.to(noticeRef.current, { autoAlpha: 1, duration: 0.5, ease: EASE.hard });
        gsap.to(ghostRef.current, { autoAlpha: 0.14, scale: 1.06, duration: 1.4, ease: EASE.expo });
      };
      const onBlur = () => {
        gsap.to(watchRef.current, { autoAlpha: 0, duration: 0.8, ease: EASE.inOut });
        gsap.to(ruleRef.current, { scaleX: 0, duration: 0.45, ease: EASE.inOut });
        gsap.to(noticeRef.current, { autoAlpha: 0, duration: 0.35, ease: EASE.inOut });
        gsap.to(ghostRef.current, { autoAlpha: 0.05, scale: 1, duration: 0.9, ease: EASE.inOut });
      };
      // Every keystroke kicks the caret, so typing feels physical.
      const onInput = () => {
        gsap.fromTo(
          caretRef.current,
          { scaleY: 1.5, x: 3 },
          { scaleY: 1, x: 0, duration: 0.22, ease: EASE.overshoot, overwrite: "auto" },
        );
      };

      field?.addEventListener("focus", onFocus);
      field?.addEventListener("blur", onBlur);
      field?.addEventListener("input", onInput);

      /* ---- Magnetic submit. ---- */
      const magnetCleanups: Array<() => void> = [];
      mm.add("(hover: hover) and (pointer: fine)", () => {
        const button = q(".crew-magnet")[0] as HTMLElement | undefined;
        if (!button) return;

        const label = button.querySelector<HTMLElement>(".crew-magnet-label");
        const fill = button.querySelector<HTMLElement>(".crew-magnet-fill");
        const toX = gsap.quickTo(button, "x", { duration: 0.5, ease: EASE.expo });
        const toY = gsap.quickTo(button, "y", { duration: 0.5, ease: EASE.expo });
        const labelX = gsap.quickTo(label, "x", { duration: 0.65, ease: EASE.expo });
        const labelY = gsap.quickTo(label, "y", { duration: 0.65, ease: EASE.expo });

        const onMove = (event: PointerEvent) => {
          const rect = button.getBoundingClientRect();
          const dx = event.clientX - (rect.left + rect.width / 2);
          const dy = event.clientY - (rect.top + rect.height / 2);
          toX(dx * 0.34);
          toY(dy * 0.5);
          labelX(dx * 0.12);
          labelY(dy * 0.18);
        };
        const onEnter = () => {
          gsap.to(fill, { clipPath: "inset(0% 0 0 0)", duration: 0.5, ease: EASE.expo });
          gsap.to(label, { color: COLOR.black, duration: 0.3 });
        };
        const onLeave = () => {
          toX(0);
          toY(0);
          labelX(0);
          labelY(0);
          gsap.to(fill, { clipPath: "inset(100% 0 0 0)", duration: 0.4, ease: EASE.inOut });
          gsap.to(label, { color: COLOR.boneWhite, duration: 0.35 });
        };

        // Bounds are padded so the pull starts before the cursor lands on it.
        const zone = button.parentElement;
        zone?.addEventListener("pointermove", onMove);
        zone?.addEventListener("pointerenter", onEnter);
        zone?.addEventListener("pointerleave", onLeave);

        magnetCleanups.push(() => {
          zone?.removeEventListener("pointermove", onMove);
          zone?.removeEventListener("pointerenter", onEnter);
          zone?.removeEventListener("pointerleave", onLeave);
        });
      });

      /* ---- Continuous layer, parked until the section is on screen. ---- */
      const loops: gsap.core.Animation[] = [];
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const caret = gsap.to(caretRef.current, {
          autoAlpha: 0,
          duration: 0.5,
          ease: "steps(1)",
          repeat: -1,
          yoyo: true,
        });
        const dot = gsap.to(".crew-watch-dot", {
          autoAlpha: 0.15,
          duration: 0.55,
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true,
        });
        loops.push(caret, dot);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "crew-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      return () => {
        headingSplit.revert();
        field?.removeEventListener("focus", onFocus);
        field?.removeEventListener("blur", onBlur);
        field?.removeEventListener("input", onInput);
        magnetCleanups.forEach((fn) => fn());
      };
    }, rootRef);

    ctxRef.current = ctx;
    return () => {
      ctxRef.current = null;
      ctx.revert();
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = fieldRef.current?.value.trim() ?? "";

    if (!EMAIL.test(value)) {
      // Rejection is physical: the whole row refuses, it does not turn red-on-red.
      ctxRef.current?.add(() => {
        gsap.to(".crew-form-row", {
          keyframes: [
            { x: -12, duration: 0.05 },
            { x: 9, duration: 0.05 },
            { x: -5, duration: 0.05 },
            { x: 0, duration: 0.08 },
          ],
          ease: "none",
        });
        gsap.fromTo(
          ".crew-error",
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.3, ease: EASE.hard },
        );
      });
      return;
    }

    setSigned(true);
    ctxRef.current?.add(() => {
      gsap.to(".crew-error", { autoAlpha: 0, duration: 0.2 });
      gsap
        .timeline()
        .to(formRef.current, { autoAlpha: 0, yPercent: -18, duration: 0.5, ease: EASE.expo })
        .fromTo(
          receiptRef.current,
          { autoAlpha: 0, yPercent: 30, scale: 0.94 },
          { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.8, ease: EASE.overshoot },
          "-=0.15",
        )
        .to(
          ".crew-receipt-head",
          {
            duration: 1,
            ease: "power2.inOut",
            scrambleText: { text: CREW_COPY.done, chars: "upperCase", speed: 0.7 },
          },
          "-=0.5",
        );
      gsap.to(watchRef.current, { autoAlpha: 0, duration: 0.8, ease: EASE.inOut });
    });
  };

  return (
    <section ref={rootRef} id="crew" className="relative overflow-hidden bg-black pb-[14vh] pt-[14vh]">
      <span
        ref={watchRef}
        aria-hidden
        className={`${styles.watch} pointer-events-none absolute inset-0 z-0 opacity-0`}
      />

      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-[28vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {CREW_COPY.aside}
      </span>

      <span
        ref={ghostRef}
        aria-hidden
        className={`${styles.ghost} pointer-events-none absolute -bottom-[6vh] left-[4vw] z-0 hidden font-blackletter text-[20vw] leading-none text-outline-2 opacity-[0.05] lg:block`}
      >
        {CREW_COPY.ghost}
      </span>

      <div className="relative z-10 px-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <span className="crew-meta font-stencil text-stamp text-concrete-gray">
            {CREW_COPY.eyebrow}
          </span>
          <span className="crew-meta border border-blood-accent px-3 py-2 font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
            {CREW_COPY.stamp}
          </span>
        </div>

        {/* Display line and blackletter line overlap on a shared baseline. */}
        <div className="relative mt-[5vh] flex flex-wrap items-end gap-x-5">
          <h2 className="split-mask block pb-[0.08em]">
            <span className="crew-heading text-distress block font-display text-display-xl leading-[0.82] text-bone-white">
              {CREW_COPY.heading}
            </span>
          </h2>
          <span className="crew-heading-alt -ml-1 block pb-[0.1em] font-blackletter text-[clamp(2rem,5.5vw,4.6rem)] leading-[0.85] text-blood-accent sm:-ml-5">
            {CREW_COPY.headingAlt}
          </span>
        </div>

        {/* ── Form ──────────────────────────────────────────────────── */}
        <div className="relative mt-[7vh] max-w-[46rem]">
          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="crew-form-row flex items-center gap-3">
              <span className="crew-watch-dot block h-[7px] w-[7px] shrink-0 bg-blood-accent" />
              <label
                htmlFor="crew-email"
                className="font-stencil text-[0.52rem] tracking-stencil text-concrete-gray"
              >
                {CREW_COPY.label}
              </label>
              <span
                ref={noticeRef}
                aria-hidden
                className="ml-auto font-stencil text-[0.48rem] tracking-stencil text-blood-accent opacity-0"
              >
                {CREW_COPY.watching}
              </span>
            </div>

            <div className="crew-form-row relative mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-end sm:gap-5">
              <div className="relative min-w-0 flex-1">
                <div className="flex items-center">
                  <input
                    ref={fieldRef}
                    id="crew-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
                    placeholder={CREW_COPY.placeholder}
                    className={`${styles.field} w-full min-w-0 border-0 bg-transparent pb-4 font-display text-[clamp(1.15rem,3.2vw,2.6rem)] uppercase tracking-crushed text-bone-white outline-none`}
                  />
                  <span
                    ref={caretRef}
                    aria-hidden
                    className={`${styles.caret} mb-5 ml-1 block h-[clamp(1rem,2.6vw,2.1rem)] w-[0.35em] shrink-0 bg-blood-accent`}
                  />
                </div>
                <span className="absolute inset-x-0 bottom-0 block h-px bg-bone-white/20" />
                <span
                  ref={ruleRef}
                  className={`${styles.rule} absolute inset-x-0 bottom-0 block h-px bg-blood-accent`}
                />
              </div>

              {/* Padded zone so the pull begins before the cursor arrives. */}
              <div className="relative shrink-0 sm:p-6">
                <button
                  type="submit"
                  className={`${styles.magnet} crew-magnet clip-cut relative block w-full overflow-hidden border border-bone-white/35 px-8 py-4 sm:w-auto`}
                >
                  <span
                    aria-hidden
                    className={`${styles.magnetFill} crew-magnet-fill absolute inset-0 bg-bone-white`}
                  />
                  <span className="crew-magnet-label relative block whitespace-nowrap font-stencil text-[0.58rem] tracking-stencil text-bone-white">
                    {CREW_COPY.submit}
                  </span>
                </button>
              </div>
            </div>

            <div className="crew-form-row mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="crew-error font-stencil text-[0.5rem] tracking-stencil text-blood-accent opacity-0">
                {CREW_COPY.invalid}
              </span>
              <span className="ml-auto font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
                {CREW_COPY.terms}
              </span>
            </div>
          </form>

          {/* Replaces the form once the address is accepted. */}
          <div
            ref={receiptRef}
            aria-live="polite"
            className={`${styles.receipt} ${styles.hatch} pointer-events-none absolute inset-x-0 top-0 border border-blood-accent bg-black/80 p-8`}
          >
            <p className="crew-receipt-head font-display text-[clamp(1.4rem,3vw,2.4rem)] uppercase leading-none tracking-crushed text-bone-white">
              {signed ? CREW_COPY.done : ""}
            </p>
            <p className="mt-4 font-body text-[0.98rem] text-concrete-gray">{CREW_COPY.doneLine}</p>
          </div>
        </div>

        {/* ── Ledger ────────────────────────────────────────────────── */}
        <div className="mt-[9vh]">
          <div className="hairline" />
          <div className="mt-6 grid grid-cols-3 gap-4">
            {CREW_COPY.ledger.map((entry) => (
              <div key={entry.label} className="crew-meta">
                <p className="font-display text-[clamp(1.4rem,2.8vw,2.4rem)] leading-none tracking-crushed text-bone-white">
                  {entry.value}
                </p>
                <p className="mt-3 font-stencil text-[0.5rem] leading-relaxed tracking-stencil text-concrete-gray">
                  {entry.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
