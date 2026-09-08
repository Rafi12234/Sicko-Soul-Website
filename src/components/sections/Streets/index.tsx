"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { STREETS_COPY } from "@/data/streets";
import styles from "./Streets.module.css";

export default function Streets() {
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const primaryFrameRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);
  const sealRef = useRef<HTMLDivElement>(null);
  const quoteRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      gsap.set(".streets-tag", { rotate: -7, opacity: 0.9 });

      /* ---- Frames: letterbox open, then the artwork settles out of a push-in. */
      q(".streets-frame").forEach((frame, i) => {
        gsap.to(frame, {
          clipPath: "inset(0% 0 0% 0)",
          duration: 1.15,
          ease: EASE.expo,
          scrollTrigger: {
            id: `streets-frame-${i}`,
            trigger: frame,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
        gsap.from(frame.querySelector("img"), {
          scale: 1.25,
          duration: 1.5,
          ease: EASE.expo,
          scrollTrigger: {
            trigger: frame,
            start: "top 82%",
            toggleActions: "play none none reverse",
          },
        });
      });

      /* ---- Sprayed tag: characters land out of order, like a can being worked. */
      const tagSplit = new SplitText(".streets-tag", { type: "chars" });
      gsap.from(tagSplit.chars, {
        autoAlpha: 0,
        scale: 0.55,
        yPercent: 40,
        rotate: () => gsap.utils.random(-38, 38),
        transformOrigin: "50% 100%",
        duration: 0.9,
        stagger: { each: 0.035, from: "random" },
        ease: EASE.overshoot,
        scrollTrigger: {
          id: "streets-tag",
          trigger: mediaRef.current,
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Heading: letters grow off the baseline rather than sliding in. */
      const headingSplit = new SplitText(".streets-heading", { type: "chars" });
      gsap.from(headingSplit.chars, {
        scaleY: 0,
        yPercent: 28,
        autoAlpha: 0,
        transformOrigin: "0% 100%",
        duration: 0.95,
        stagger: STAGGER.chars,
        ease: EASE.expo,
        scrollTrigger: {
          id: "streets-heading",
          trigger: rootRef.current,
          start: "top 62%",
          toggleActions: "play none none reverse",
        },
      });

      const bodySplit = new SplitText(".streets-body", { type: "lines", linesClass: "split-mask" });
      gsap.from(bodySplit.lines, {
        yPercent: 105,
        duration: 0.9,
        stagger: STAGGER.lines,
        ease: EASE.expo,
        scrollTrigger: {
          id: "streets-body",
          trigger: ".streets-copy",
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from(q(".streets-meta"), {
        autoAlpha: 0,
        y: 22,
        duration: 0.8,
        stagger: 0.08,
        ease: EASE.hard,
        scrollTrigger: {
          id: "streets-meta",
          trigger: ".streets-copy",
          start: "top 62%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.to(q(".streets-spine"), {
        scaleY: 1,
        duration: 1.4,
        ease: EASE.expo,
        scrollTrigger: {
          id: "streets-spine",
          trigger: mediaRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Pull-quote decrypts on entry (ANIMATION_GUIDE, The Streets). ---- */
      if (quoteRef.current) quoteRef.current.textContent = STREETS_COPY.quoteCipher;
      ScrollTrigger.create({
        id: "streets-quote",
        trigger: quoteRef.current,
        start: "top 78%",
        onEnter: () =>
          gsap.to(quoteRef.current, {
            duration: 1.6,
            ease: "power2.inOut",
            scrambleText: { text: STREETS_COPY.quote, chars: "upperCase", speed: 0.55 },
          }),
      });

      q(".streets-stat-value").forEach((value, i) => {
        const target = STREETS_COPY.stats[i].value;
        ScrollTrigger.create({
          id: `streets-stat-${i}`,
          trigger: value,
          start: "top 88%",
          onEnter: () =>
            gsap.to(value, {
              duration: 0.9,
              delay: i * 0.08,
              ease: "power2.inOut",
              scrambleText: { text: target, chars: "0123456789", speed: 0.8 },
            }),
        });
      });

      /* ---- Seal turns forever; ease "none" is only legal on loops. ---- */
      const sealSpin = gsap.to(sealRef.current, {
        rotate: 360,
        duration: 22,
        ease: EASE.loop,
        repeat: -1,
      });

      /* ---- Continuous layer. Everything here idles until the section is on
         screen, then runs forever — the section is never visually static. --- */
      const loops: gsap.core.Animation[] = [sealSpin];

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // The tag drifts and flickers like paint that has not fully dried.
        const tagJitter = gsap
          .timeline({ repeat: -1, repeatDelay: 2.6 })
          .to(".streets-tag", { x: 4, y: -3, rotate: -6.4, duration: 0.06, ease: "none" })
          .to(".streets-tag", { x: -5, y: 2, rotate: -7.6, duration: 0.06, ease: "none" })
          .to(".streets-tag", { x: 2, y: -1, rotate: -6.8, duration: 0.06, ease: "none" })
          .to(".streets-tag", { x: 0, y: 0, rotate: -7, duration: 0.1, ease: "none" })
          .to(".streets-tag", { opacity: 0.42, duration: 0.05, ease: "none" }, 0)
          .to(".streets-tag", { opacity: 0.9, duration: 0.16, ease: "none" }, 0.12);

        const scanSweep = gsap.fromTo(
          ".streets-scan",
          { y: 0, autoAlpha: 0 },
          {
            y: () => primaryFrameRef.current?.offsetHeight ?? 0,
            autoAlpha: 1,
            duration: 3.4,
            ease: "none",
            repeat: -1,
            repeatDelay: 2.8,
            repeatRefresh: true,
          },
        );

        const recBlink = gsap.to(".streets-rec-dot", {
          autoAlpha: 0.15,
          duration: 0.55,
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true,
        });

        // Figures keep re-reading themselves, like a terminal refusing to settle.
        const statLoop = gsap.timeline({ repeat: -1, repeatDelay: 4.2 });
        q(".streets-stat-value").forEach((value, i) => {
          statLoop.to(
            value,
            {
              duration: 0.75,
              ease: "power2.inOut",
              scrambleText: {
                text: STREETS_COPY.stats[i].value,
                chars: "0123456789",
                speed: 0.9,
              },
            },
            i * 0.14,
          );
        });

        loops.push(tagJitter, scanSweep, recBlink, statLoop);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "streets-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      const ctaCleanups = q(".streets-cta").map((button) => {
        const fill = button.querySelector<HTMLElement>(".streets-cta-fill");
        const label = button.querySelector<HTMLElement>(".streets-cta-label");

        const onOver = () => {
          gsap.to(fill, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.5,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(label, { color: COLOR.black, duration: 0.25, overwrite: "auto" });
        };
        const onOut = () => {
          gsap.to(fill, {
            clipPath: "inset(0 100% 0 0)",
            duration: 0.38,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(label, { color: COLOR.boneWhite, duration: 0.3, overwrite: "auto" });
        };

        button.addEventListener("pointerenter", onOver);
        button.addEventListener("pointerleave", onOut);
        return () => {
          button.removeEventListener("pointerenter", onOver);
          button.removeEventListener("pointerleave", onOut);
        };
      });

      /* ---- Layered parallax: the two plates never travel at the same rate. */
      mm.add("(min-width: 768px)", () => {        gsap.to(primaryRef.current, {
          yPercent: -13,
          ease: "none",
          scrollTrigger: {
            id: "streets-parallax-primary",
            trigger: mediaRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to(secondaryRef.current, {
          yPercent: 18,
          ease: "none",
          scrollTrigger: {
            id: "streets-parallax-secondary",
            trigger: mediaRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
        gsap.to(".streets-tag", {
          xPercent: -6,
          ease: "none",
          scrollTrigger: {
            id: "streets-parallax-tag",
            trigger: mediaRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });

      return () => {
        tagSplit.revert();
        headingSplit.revert();
        bodySplit.revert();
        ctaCleanups.forEach((fn) => fn());
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="the-streets" className="relative bg-black pb-[16vh] pt-[14vh]">
      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute right-2 top-[28vh] hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {STREETS_COPY.seal}
      </span>

      {/* Thin rule bar instead of a heading block — Rack already owns that. */}
      <div className="px-gutter">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <p className="font-stencil text-stamp text-concrete-gray">{STREETS_COPY.eyebrow}</p>
          <p className="font-stencil text-stamp text-concrete-gray">{STREETS_COPY.aside}</p>
        </div>
        <div className="hairline mt-4" />
      </div>

      <div className="relative mt-[7vh] grid grid-cols-1 gap-y-[14vh] px-gutter lg:mt-[9vh] lg:grid-cols-12 lg:gap-x-gutter lg:gap-y-0">
        {/* ── Media stack ─────────────────────────────────────────────── */}
        <div ref={mediaRef} className="relative lg:col-span-6">
          <div
            ref={primaryFrameRef}
            className={`${styles.frame} streets-frame relative aspect-[3/4] overflow-hidden border border-bone-white/15`}
          >
            <div ref={primaryRef} className={`${styles.media} absolute -inset-[9%]`}>
              <Image
                src="/imgs/image_4.jpg"
                alt="Three figures on a stairwell at night"
                fill
                sizes="(max-width: 1024px) 100vw, 46vw"
                className="media-treat object-cover"
              />
            </div>

            <span
              aria-hidden
              className="streets-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-blood-accent/70 opacity-0"
            />

            <span className="absolute left-4 top-4 z-10 flex items-center gap-2 bg-black/60 px-2 py-1">
              <span className="streets-rec-dot block h-[6px] w-[6px] bg-blood-accent" />
              <span className="font-stencil text-[0.55rem] tracking-stencil text-bone-white/80">
                {STREETS_COPY.rec}
              </span>
              <span className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
                {STREETS_COPY.caption}
              </span>
            </span>
          </div>

          {/* Breaks out of the primary frame so the block never reads as a
              tidy image-left / text-right split. */}
          <div
            className={`${styles.frame} streets-frame absolute -bottom-[9%] right-[-9%] z-10 aspect-[4/5] w-[46%] overflow-hidden border border-bone-white/20 bg-black`}
          >
            <div ref={secondaryRef} className={`${styles.media} absolute -inset-[12%]`}>
              <Image
                src="/imgs/image_5.jpg"
                alt="Masked crew on a lower parking deck"
                fill
                sizes="(max-width: 1024px) 50vw, 22vw"
                className="media-treat object-cover"
              />
            </div>
            <span className="absolute bottom-3 left-3 z-10 font-stencil text-[0.55rem] tracking-stencil text-bone-white/70">
              {STREETS_COPY.captionAlt}
            </span>
          </div>

          <div
            ref={sealRef}
            aria-hidden
            className={`${styles.seal} absolute -left-[6%] bottom-[8%] z-20 hidden h-[7.5rem] w-[7.5rem] sm:block`}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <path
                  id="streets-seal-ring"
                  fill="none"
                  d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
                />
              </defs>
              <circle cx="100" cy="100" r="86" className="fill-black/70" />
              <circle cx="100" cy="100" r="9" className="fill-blood-accent" />
              <text className="fill-bone-white font-stencil text-[15px] tracking-[0.34em]">
                <textPath href="#streets-seal-ring">{STREETS_COPY.seal.repeat(2)}</textPath>
              </text>
            </svg>
          </div>

          {/* Sprayed over the plate and running off into the copy column. */}
          <span
            aria-hidden
            className={`${styles.tag} streets-tag text-distress pointer-events-none absolute left-[3%] top-[9%] z-20 block whitespace-nowrap font-gothic text-hero leading-none text-blood-accent`}
          >
            {STREETS_COPY.tag}
          </span>
        </div>

        <span
          aria-hidden
          className={`${styles.spine} streets-spine absolute left-1/2 top-0 hidden h-full w-px bg-bone-white/10 lg:block`}
        />

        {/* ── Copy ────────────────────────────────────────────────────── */}
        <div className="streets-copy lg:col-span-5 lg:col-start-8 lg:pt-[16vh]">
          <div className="streets-meta mb-7 flex items-center gap-4">
            <span className="h-px w-10 bg-blood-accent" />
            <span className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
              {STREETS_COPY.originLabel}
            </span>
          </div>

          {/* Brush script over Old English — the tattoo-flash lockup. Scale and
              face both change between the two lines, not just the size. */}
          <h2 className="relative">
            <span className="split-mask block pb-[0.14em]">
              <span className="streets-heading block font-script text-[clamp(2.1rem,3.4vw,3rem)] leading-[0.9] text-blood-accent">
                {STREETS_COPY.headingSmall}
              </span>
            </span>
            <span className="split-mask -mt-[0.34em] block pb-[0.14em] pl-[6%]">
              <span className="streets-heading text-distress block whitespace-nowrap font-blackletter text-[clamp(1.75rem,3.5vw,3rem)] leading-[1] text-bone-white">
                {STREETS_COPY.headingLarge}
              </span>
            </span>
          </h2>

          <div className="mt-9 space-y-7">
            {STREETS_COPY.body.map((paragraph) => (
              <div key={paragraph.index} className="flex gap-5">
                <span className="streets-meta mt-[0.45rem] shrink-0 font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
                  {paragraph.index}
                </span>
                <p className="streets-body max-w-[46ch] font-body text-[1.02rem] leading-[1.75] text-bone-white/65">
                  <span className="font-display text-[1.18rem] uppercase tracking-[0.02em] text-bone-white">
                    {paragraph.lead}
                  </span>{" "}
                  {paragraph.rest}
                </p>
              </div>
            ))}
          </div>

          {/* Anton here on purpose: the blackletter above stays the one
              unrepeatable moment in the column. */}
          <div className="streets-meta mt-11 border-l-2 border-blood-accent pl-6">
            <p
              ref={quoteRef}
              className="font-display text-[clamp(1.4rem,2.5vw,2.4rem)] uppercase leading-[1.08] tracking-crushed text-bone-white"
            >
              {STREETS_COPY.quote}
            </p>
          </div>

          <div className="streets-meta mt-11 grid grid-cols-3 gap-4 border-t border-bone-white/12 pt-7">
            {STREETS_COPY.stats.map((stat, i) => (
              <div key={stat.label}>
                <p
                  className={`streets-stat-value font-display text-[clamp(1.7rem,3.1vw,2.7rem)] leading-none tracking-crushed ${
                    i === 1 ? "text-outline" : "text-bone-white"
                  }`}
                >
                  {stat.value}
                </p>
                <p className="mt-3 font-stencil text-[0.53rem] leading-relaxed tracking-stencil text-concrete-gray">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="streets-meta streets-cta clip-cut relative mt-11 overflow-hidden border border-bone-white/30 px-10 py-4"
          >
            <span
              aria-hidden
              className={`${styles.ctaFill} streets-cta-fill absolute inset-0 bg-bone-white`}
            />
            <span className="streets-cta-label relative block font-stencil text-[0.6rem] tracking-stencil text-bone-white">
              {STREETS_COPY.cta}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
