"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER, themeColor } from "@/styles/theme";
import { FEEDBACK_COPY } from "@/data/feedback";
import styles from "./Feedback.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function Feedback() {
  const rootRef = useRef<HTMLElement>(null);
  const watchRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<ReturnType<typeof gsap.context> | null>(null);

  const [category, setCategory] = useState<string>(FEEDBACK_COPY.categories[0].id);
  const [error, setError] = useState<string>("");
  const [caseRef, setCaseRef] = useState<string>("");

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      gsap.set(receiptRef.current, { autoAlpha: 0, yPercent: 26 });

      /* ---- Masthead. ---- */
      const headingSplit = new SplitText(".fb-heading", { type: "chars" });
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "fb-intro",
          trigger: rootRef.current,
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: 120,
          autoAlpha: 0,
          rotate: 5,
          duration: 1,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".fb-heading-alt",
          { autoAlpha: 0, scale: 0.85, rotate: -7, duration: 0.9, ease: EASE.overshoot },
          "-=0.55",
        )
        .from(
          ".fb-meta",
          { autoAlpha: 0, y: 18, duration: 0.65, stagger: 0.07, ease: EASE.hard },
          "-=0.6",
        )
        // The form is dealt onto the desk, not faded in.
        .from(
          ".fb-sheet",
          { autoAlpha: 0, yPercent: 12, rotate: -1.5, duration: 0.95, ease: EASE.expo },
          "-=0.45",
        );

      /* ---- Any field focus darkens the red around the sheet. ---- */
      const fields = q(".fb-field") as HTMLElement[];
      const fieldCleanups = fields.map((field) => {
        const rule = field.parentElement?.querySelector<HTMLElement>(".fb-rule") ?? null;
        const onFocus = () => {
          gsap.to(watchRef.current, { autoAlpha: 1, duration: 0.9, ease: EASE.expo });
          gsap.to(".fb-watching", { autoAlpha: 1, duration: 0.45, ease: EASE.hard });
          gsap.to(rule, { scaleX: 1, duration: 0.6, ease: EASE.expo });
          gsap.to(ghostRef.current, { autoAlpha: 0.85, duration: 1.2, ease: EASE.expo });
        };
        const onBlur = () => {
          gsap.to(watchRef.current, { autoAlpha: 0, duration: 0.7, ease: EASE.inOut });
          gsap.to(".fb-watching", { autoAlpha: 0, duration: 0.3, ease: EASE.inOut });
          gsap.to(rule, { scaleX: 0, duration: 0.4, ease: EASE.inOut });
          gsap.to(ghostRef.current, { autoAlpha: 0.5, duration: 0.8, ease: EASE.inOut });
        };
        field.addEventListener("focus", onFocus);
        field.addEventListener("blur", onBlur);
        return () => {
          field.removeEventListener("focus", onFocus);
          field.removeEventListener("blur", onBlur);
        };
      });

      /* ---- Category chips fill from the left when armed. ---- */
      const chipCleanups = q(".fb-chip").map((chip) => {
        const fill = chip.querySelector<HTMLElement>(".fb-chip-fill");
        const onOver = () => {
          if ((chip as HTMLElement).dataset.armed === "true") return;
          gsap.to(fill, { clipPath: "inset(0 60% 0 0)", duration: 0.4, ease: EASE.expo });
        };
        const onOut = () => {
          if ((chip as HTMLElement).dataset.armed === "true") return;
          gsap.to(fill, { clipPath: "inset(0 100% 0 0)", duration: 0.3, ease: EASE.inOut });
        };
        chip.addEventListener("pointerenter", onOver);
        chip.addEventListener("pointerleave", onOut);
        return () => {
          chip.removeEventListener("pointerenter", onOver);
          chip.removeEventListener("pointerleave", onOut);
        };
      });

      /* ---- Magnetic submit. ---- */
      const magnetCleanups: Array<() => void> = [];
      mm.add("(hover: hover) and (pointer: fine)", () => {
        const button = q(".fb-magnet")[0] as HTMLElement | undefined;
        if (!button) return;

        const label = button.querySelector<HTMLElement>(".fb-magnet-label");
        const fill = button.querySelector<HTMLElement>(".fb-magnet-fill");
        const toX = gsap.quickTo(button, "x", { duration: 0.5, ease: EASE.expo });
        const toY = gsap.quickTo(button, "y", { duration: 0.5, ease: EASE.expo });

        const onMove = (event: PointerEvent) => {
          const rect = button.getBoundingClientRect();
          toX((event.clientX - (rect.left + rect.width / 2)) * 0.32);
          toY((event.clientY - (rect.top + rect.height / 2)) * 0.48);
        };
        const onEnter = () => {
          gsap.to(fill, { clipPath: "inset(0% 0 0 0)", duration: 0.5, ease: EASE.expo });
          gsap.to(label, { color: COLOR.boneWhite, duration: 0.3 });
        };
        const onLeave = () => {
          toX(0);
          toY(0);
          gsap.to(fill, { clipPath: "inset(100% 0 0 0)", duration: 0.4, ease: EASE.inOut });
          gsap.to(label, { color: themeColor(button, "--c-fg"), duration: 0.35 });
        };

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

      /* ---- Continuous layer, parked until the desk is on screen. ---- */
      const loops: gsap.core.Animation[] = [];
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        loops.push(
          gsap.to(".fb-caret", {
            autoAlpha: 0,
            duration: 0.5,
            ease: "steps(1)",
            repeat: -1,
            yoyo: true,
          }),
          gsap.to(".fb-rec-dot", {
            autoAlpha: 0.15,
            duration: 0.55,
            ease: "power1.inOut",
            repeat: -1,
            yoyo: true,
          }),
        );
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "fb-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((l) => (self.isActive ? l.play() : l.pause())),
      });

      return () => {
        headingSplit.revert();
        fieldCleanups.forEach((fn) => fn());
        chipCleanups.forEach((fn) => fn());
        magnetCleanups.forEach((fn) => fn());
      };
    }, rootRef);

    ctxRef.current = ctx;
    return () => {
      ctxRef.current = null;
      ctx.revert();
    };
  }, []);

  const reject = (message: string) => {
    setError(message);
    ctxRef.current?.add(() => {
      gsap.to(".fb-sheet", {
        keyframes: [
          { x: -13, duration: 0.05 },
          { x: 10, duration: 0.05 },
          { x: -5, duration: 0.05 },
          { x: 0, duration: 0.08 },
        ],
        ease: "none",
      });
      gsap.fromTo(
        ".fb-error",
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.3, ease: EASE.hard },
      );
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = emailRef.current?.value.trim() ?? "";
    const message = messageRef.current?.value.trim() ?? "";

    if (!EMAIL.test(email)) return reject(FEEDBACK_COPY.errors.email);
    if (message.length < 10) return reject(FEEDBACK_COPY.errors.message);

    setError("");
    // Client-only, so it cannot desync between server and client render.
    setCaseRef(String(Date.now()).slice(-6));

    ctxRef.current?.add(() => {
      gsap.to(".fb-error", { autoAlpha: 0, duration: 0.2 });
      gsap
        .timeline()
        .to(formRef.current, { autoAlpha: 0, yPercent: -12, duration: 0.45, ease: EASE.expo })
        .fromTo(
          receiptRef.current,
          { autoAlpha: 0, yPercent: 26, scale: 0.95 },
          { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.75, ease: EASE.overshoot },
          "-=0.1",
        )
        .to(
          ".fb-receipt-head",
          {
            duration: 0.9,
            ease: "power2.inOut",
            scrambleText: { text: FEEDBACK_COPY.done.head, chars: "upperCase", speed: 0.7 },
          },
          "-=0.45",
        )
        .fromTo(
          ".fb-stamp",
          { autoAlpha: 0, scale: 1.9, rotate: -22 },
          { autoAlpha: 1, scale: 1, rotate: -11, duration: 0.5, ease: EASE.overshoot },
          "-=0.3",
        );
      gsap.to(watchRef.current, { autoAlpha: 0, duration: 0.6, ease: EASE.inOut });
    });
  };

  const armChip = (id: string) => {
    setCategory(id);
    ctxRef.current?.add(() => {
      const root = rootRef.current;
      if (!root) return;
      FEEDBACK_COPY.categories.forEach((c) => {
        const chip = root.querySelector<HTMLElement>(`[data-chip="${c.id}"]`);
        const fill = chip?.querySelector<HTMLElement>(".fb-chip-fill") ?? null;
        if (!fill) return;
        gsap.to(fill, {
          clipPath: c.id === id ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
          duration: c.id === id ? 0.5 : 0.3,
          ease: c.id === id ? EASE.expo : EASE.inOut,
          overwrite: "auto",
        });
      });
    });
  };

  return (
    <section
      ref={rootRef}
      id="complaints"
      className="theme-blood relative overflow-hidden bg-black pb-[14vh] pt-[14vh]"
    >
      <span
        ref={watchRef}
        aria-hidden
        className={`${styles.watch} pointer-events-none absolute inset-0 z-0 opacity-0`}
      />

      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-[26vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-bone-white/50 xl:block`}
      >
        {FEEDBACK_COPY.aside}
      </span>

      <span
        ref={ghostRef}
        aria-hidden
        className={`${styles.ghost} pointer-events-none absolute -bottom-[6vh] right-[3vw] z-0 hidden font-blackletter text-[15vw] leading-none opacity-[0.5] lg:block`}
      >
        {FEEDBACK_COPY.ghost}
      </span>

      <div className="relative z-10 px-gutter">
        {/* Masthead left, form right — stacked they made the section a screen
            and a half tall and clipped the sheet. */}
        <div className="grid items-start gap-x-[5vw] gap-y-[6vh] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="fb-meta flex items-center gap-4">
                <span className="fb-rec-dot block h-[7px] w-[7px] bg-ink" />
                <span className="font-stencil text-stamp text-bone-white/75">
                  {FEEDBACK_COPY.eyebrow}
                </span>
              </div>
              <span className="fb-meta border border-ink px-3 py-2 font-stencil text-[0.55rem] tracking-stencil text-ink">
                {FEEDBACK_COPY.stamp}
              </span>
            </div>

            {/* Paper display word, solid black blackletter answering it. */}
            <div className="relative mt-[4vh] flex flex-wrap items-end gap-x-4">
              <h2 className="split-mask block pb-[0.08em]">
                <span className="fb-heading text-distress block font-display text-display leading-[0.82] text-bone-white">
                  {FEEDBACK_COPY.heading}
                </span>
              </h2>
              <span className="fb-heading-alt block pb-[0.1em] font-blackletter text-[clamp(1.7rem,4.4vw,3.6rem)] leading-[0.85] text-ink">
                {FEEDBACK_COPY.headingAlt}
              </span>
            </div>

            <p className="fb-meta mt-5 max-w-[38ch] font-body text-body-lg text-bone-white/80">
              {FEEDBACK_COPY.intro}
            </p>

            {/* Ledger tucks under the masthead instead of adding another band. */}
            <div className="mt-[6vh]">
              <div className="h-px w-full bg-ink/30" />
              <div className="mt-6 grid grid-cols-3 gap-4">
                {FEEDBACK_COPY.ledger.map((entry) => (
                  <div key={entry.label} className="fb-meta">
                    <p className="font-display text-[clamp(1.3rem,2.4vw,2.1rem)] leading-none tracking-crushed text-ink">
                      {entry.value}
                    </p>
                    <p className="mt-3 font-stencil text-[0.48rem] leading-relaxed tracking-stencil text-bone-white/70">
                      {entry.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── The form, on paper ────────────────────────────────────── */}
          <div className="fb-sheet theme-light relative bg-black px-[6vw] py-[5vh] shadow-print lg:px-[2.8vw]">
          <div className="mb-7 flex items-center gap-3">
            <span className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
              {FEEDBACK_COPY.sheetRef}
            </span>
            <span className="h-px flex-1 bg-bone-white/15" />
            <span className="fb-watching font-stencil text-[0.48rem] tracking-stencil text-blood-accent opacity-0">
              {FEEDBACK_COPY.watching}
            </span>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} noValidate>
            <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {(["name", "email"] as const).map((key) => (
                <div key={key}>
                  <label
                    htmlFor={`fb-${key}`}
                    className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray"
                  >
                    {FEEDBACK_COPY.fields[key].label}
                  </label>
                  <div className="relative mt-2">
                    <input
                      ref={key === "email" ? emailRef : undefined}
                      id={`fb-${key}`}
                      type={key === "email" ? "email" : "text"}
                      autoComplete={key === "email" ? "email" : "name"}
                      spellCheck={false}
                      placeholder={FEEDBACK_COPY.fields[key].placeholder}
                      className={`${styles.field} fb-field w-full border-0 bg-transparent pb-3 font-display text-[clamp(1rem,1.9vw,1.5rem)] uppercase tracking-crushed text-bone-white outline-none`}
                    />
                    <span className="absolute inset-x-0 bottom-0 block h-px bg-bone-white/25" />
                    <span
                      className={`${styles.rule} fb-rule absolute inset-x-0 bottom-0 block h-px bg-blood-accent`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <label
                htmlFor="fb-order"
                className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray"
              >
                {FEEDBACK_COPY.fields.order.label}
              </label>
              <div className="relative mt-2 max-w-[22rem]">
                <input
                  id="fb-order"
                  type="text"
                  spellCheck={false}
                  placeholder={FEEDBACK_COPY.fields.order.placeholder}
                  className={`${styles.field} fb-field w-full border-0 bg-transparent pb-3 font-display text-[clamp(1rem,1.9vw,1.5rem)] uppercase tracking-crushed text-bone-white outline-none`}
                />
                <span className="absolute inset-x-0 bottom-0 block h-px bg-bone-white/25" />
                <span
                  className={`${styles.rule} fb-rule absolute inset-x-0 bottom-0 block h-px bg-blood-accent`}
                />
              </div>
            </div>

            {/* Category is armed, not selected from a dropdown. */}
            <fieldset className="mt-8">
              <legend className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray">
                {FEEDBACK_COPY.categoryLabel}
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {FEEDBACK_COPY.categories.map((c) => {
                  const armed = c.id === category;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      data-chip={c.id}
                      data-armed={armed}
                      aria-pressed={armed}
                      onClick={() => armChip(c.id)}
                      className="fb-chip clip-cut relative overflow-hidden border border-bone-white/35 px-4 py-2"
                    >
                      <span
                        aria-hidden
                        className={`${styles.chipFill} fb-chip-fill absolute inset-0 bg-blood-accent`}
                        style={armed ? { clipPath: "inset(0 0% 0 0)" } : undefined}
                      />
                      <span
                        className={`relative block font-stencil text-[0.5rem] tracking-stencil ${
                          armed ? "text-paper" : "text-bone-white"
                        }`}
                      >
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-8">
              <label
                htmlFor="fb-message"
                className="font-stencil text-[0.5rem] tracking-stencil text-concrete-gray"
              >
                {FEEDBACK_COPY.fields.message.label}
              </label>
              <div className="relative mt-2">
                <textarea
                  ref={messageRef}
                  id="fb-message"
                  rows={4}
                  placeholder={FEEDBACK_COPY.fields.message.placeholder}
                  className={`${styles.field} fb-field w-full resize-none border-0 bg-transparent pb-3 font-body text-[1.02rem] leading-relaxed text-bone-white outline-none`}
                />
                <span className="absolute inset-x-0 bottom-0 block h-px bg-bone-white/25" />
                <span
                  className={`${styles.rule} fb-rule absolute inset-x-0 bottom-0 block h-px bg-blood-accent`}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-y-4">
              <span className="fb-error font-stencil text-[0.5rem] tracking-stencil text-blood-accent opacity-0">
                {error}
              </span>

              <div className="relative ml-auto p-5">
                <button
                  type="submit"
                  className={`${styles.magnet} fb-magnet clip-cut relative block overflow-hidden border-2 border-bone-white px-10 py-4`}
                >
                  <span
                    aria-hidden
                    className={`${styles.magnetFill} fb-magnet-fill absolute inset-0 bg-blood-accent`}
                  />
                  <span className="fb-magnet-label relative block whitespace-nowrap font-display text-[0.95rem] uppercase tracking-crushed text-bone-white">
                    {FEEDBACK_COPY.submit}
                  </span>
                </button>
              </div>
            </div>

            <p className="mt-2 font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">
              {FEEDBACK_COPY.terms}
            </p>
          </form>

          {/* Replaces the form once the complaint is on record. */}
          <div
            ref={receiptRef}
            aria-live="polite"
            className={`${styles.receipt} ${styles.hatch} pointer-events-none absolute inset-x-6 top-[9vh] border-2 border-blood-accent bg-black p-8`}
          >
            <p className="fb-receipt-head font-display text-[clamp(1.5rem,3.2vw,2.6rem)] uppercase leading-none tracking-crushed text-bone-white">
              {FEEDBACK_COPY.done.head}
            </p>
            <p className="mt-4 max-w-[38ch] font-body text-[1rem] text-concrete-gray">
              {FEEDBACK_COPY.done.line}
            </p>
            <p className="mt-6 font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
              {`${FEEDBACK_COPY.done.ref} #${caseRef}`}
            </p>

            <span
              className={`${styles.stamp} fb-stamp absolute -right-3 -top-6 border-2 border-blood-accent bg-black px-5 py-2 font-stencil text-[0.6rem] tracking-stencil text-blood-accent opacity-0`}
            >
              {FEEDBACK_COPY.stamp}
            </span>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
