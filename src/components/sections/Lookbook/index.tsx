"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { LOOKBOOK_COPY, LOOKBOOK_FRAMES } from "@/data/lookbook";
import DistortionImage from "@/components/canvas/DistortionImage";
import styles from "./Lookbook.module.css";

export default function Lookbook() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  /** Written by the scroll trigger, read every frame by each shader. */
  const velocityRef = useRef(0);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);

      const headingSplit = new SplitText(".lookbook-heading", { type: "chars" });
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "lookbook-intro",
          trigger: rootRef.current,
          start: "top 70%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: 115,
          autoAlpha: 0,
          rotate: 5,
          duration: 1,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".lookbook-script",
          { autoAlpha: 0, scale: 0.82, rotate: -14, duration: 0.9, ease: EASE.overshoot },
          "-=0.5",
        )
        .from(
          ".lookbook-meta",
          { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.07, ease: EASE.hard },
          "-=0.6",
        );

      /* ---- Caption plates wipe open on hover. ---- */
      const captionCleanups = q(".lookbook-frame").map((frame) => {
        const caption = frame.querySelector<HTMLElement>(".lookbook-caption");
        const rule = frame.querySelector<HTMLElement>(".lookbook-rule");

        const onOver = () => {
          gsap.to(caption, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.55,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(rule, { scaleX: 1, duration: 0.6, ease: EASE.expo, overwrite: "auto" });
          gsap.to(frame, { borderColor: COLOR.bloodAccent, duration: 0.35, overwrite: "auto" });
        };
        const onOut = () => {
          gsap.to(caption, {
            clipPath: "inset(0 100% 0 0)",
            duration: 0.4,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(rule, { scaleX: 0, duration: 0.35, ease: EASE.inOut, overwrite: "auto" });
          gsap.to(frame, {
            borderColor: "rgba(242,240,235,0.15)",
            duration: 0.45,
            overwrite: "auto",
          });
        };

        frame.addEventListener("pointerenter", onOver);
        frame.addEventListener("pointerleave", onOut);
        return () => {
          frame.removeEventListener("pointerenter", onOver);
          frame.removeEventListener("pointerleave", onOut);
        };
      });

      const mm = gsap.matchMedia();

      /* ---- Desktop: pin the section and drag the row sideways. ---- */
      mm.add("(min-width: 768px)", () => {
        const track = trackRef.current;
        if (!track) return;

        const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);
        let shown = -1;

        gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            id: "lookbook-track",
            trigger: rootRef.current,
            start: "top top",
            // Pin runs longer than the travel so the row drags rather than snaps.
            end: () => `+=${distance() * 1.5}`,
            pin: pinRef.current,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              // Feeds the shaders; clamped so a flick never tears the image apart.
              velocityRef.current = gsap.utils.clamp(-1, 1, self.getVelocity() / 3000);
              gsap.set(progressRef.current, { scaleX: self.progress });

              const next = Math.min(
                LOOKBOOK_FRAMES.length - 1,
                Math.floor(self.progress * LOOKBOOK_FRAMES.length),
              );
              if (next === shown) return;
              shown = next;
              gsap.to(counterRef.current, {
                duration: 0.4,
                ease: "power2.inOut",
                scrambleText: {
                  text: LOOKBOOK_FRAMES[next].index,
                  chars: "0123456789",
                  speed: 1,
                },
                overwrite: "auto",
              });
            },
          },
        });

        // Velocity has to decay on its own or the last flick never settles.
        const decay = () => {
          velocityRef.current *= 0.92;
        };
        gsap.ticker.add(decay);
        return () => gsap.ticker.remove(decay);
      });

      /* ---- Below md the row becomes a normal vertical stack. ---- */
      mm.add("(max-width: 767px)", () => {
        ScrollTrigger.batch(q(".lookbook-frame"), {
          start: "top 85%",
          onEnter: (batch) =>
            gsap.from(batch, {
              autoAlpha: 0,
              yPercent: 14,
              duration: 0.95,
              stagger: STAGGER.images,
              ease: EASE.expo,
              overwrite: true,
            }),
        });
      });

      return () => {
        headingSplit.revert();
        captionCleanups.forEach((fn) => fn());
      };
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="lookbook" className="relative bg-black">
      <div ref={pinRef} className="relative overflow-hidden py-[12vh] md:h-screen md:py-0">
        <span
          aria-hidden
          className={`${styles.edge} pointer-events-none absolute left-2 top-[30vh] hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
        >
          {LOOKBOOK_COPY.hint}
        </span>

        <div className="px-gutter md:pt-[9vh]">
          <div className="lookbook-meta flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <p className="font-stencil text-stamp text-concrete-gray">{LOOKBOOK_COPY.eyebrow}</p>
            <p className="font-stencil text-stamp text-concrete-gray">{LOOKBOOK_COPY.aside}</p>
          </div>
          <div className="hairline mt-4" />

          {/* Display word with the brush script slung across its shoulder —
              a lockup that appears nowhere else on the page. */}
          <div className="relative mt-6 inline-block">
            <span className="split-mask block pb-[0.08em]">
              <span className="lookbook-heading text-distress block font-display text-display-xl leading-[0.85] text-bone-white">
                {LOOKBOOK_COPY.heading}
              </span>
            </span>
            <span
              aria-hidden
              className={`${styles.script} lookbook-script pointer-events-none absolute -bottom-[0.3em] left-[58%] whitespace-nowrap font-script text-[clamp(2.2rem,6vw,5rem)] leading-none text-blood-accent`}
            >
              {LOOKBOOK_COPY.headingScript}
            </span>
          </div>
        </div>

        {/* Row is the thing that translates; each frame keeps its own width. */}
        <div
          ref={trackRef}
          className={`${styles.track} lookbook-track mt-[6vh] flex flex-col gap-[8vh] px-gutter md:mt-[5vh] md:w-max md:flex-row md:items-start md:gap-[4vw] md:pr-[22vw]`}
        >
          {LOOKBOOK_FRAMES.map((frame) => (
            <article
              key={frame.id}
              className={`${styles.frame} lookbook-frame relative shrink-0 border border-bone-white/15 ${frame.width} md:w-auto ${frame.offset}`}
              data-cursor="hover"
            >
              <div className={`relative ${frame.aspect} ${frame.height} md:w-auto`}>
                <DistortionImage src={frame.src} alt={frame.alt} velocityRef={velocityRef} />

                <span className="pointer-events-none absolute left-3 top-3 z-10 font-stencil text-[0.58rem] tracking-stencil text-bone-white/70">
                  {frame.index}
                </span>

                <div
                  className={`${styles.caption} lookbook-caption pointer-events-none absolute bottom-0 left-0 right-0 z-10 bg-black/80 px-4 py-3`}
                >
                  <p className="font-display text-[clamp(1rem,1.5vw,1.4rem)] leading-none tracking-crushed text-bone-white">
                    {frame.title}
                  </p>
                  <p className="mt-2 font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
                    {frame.spec}
                  </p>
                </div>
              </div>

              <span
                aria-hidden
                className="lookbook-rule block h-px origin-left scale-x-0 bg-blood-accent"
              />
              <p className="mt-3 font-body text-[0.9rem] leading-snug text-concrete-gray">
                {frame.line}
              </p>
            </article>
          ))}

          {/* Sign-off rides at the end of the row, not under it. */}
          <div className="shrink-0 self-center md:w-[24vw]">
            <p className="font-blackletter text-[clamp(1.6rem,2.6vw,2.4rem)] leading-tight text-bone-white">
              {LOOKBOOK_COPY.outro}
            </p>
            <div className="hairline mt-5" />
            <p className="mt-4 font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
              {LOOKBOOK_COPY.outroMeta}
            </p>
          </div>
        </div>

        {/* Scrub bar reads as a tape transport, not a scrollbar. */}
        <div className="absolute inset-x-0 bottom-[5vh] hidden items-center gap-5 px-gutter md:flex">
          <span className="font-display text-[1.6rem] leading-none tracking-crushed text-bone-white">
            <span ref={counterRef}>01</span>
            <span className="text-concrete-gray">
              {` / ${String(LOOKBOOK_FRAMES.length).padStart(2, "0")}`}
            </span>
          </span>
          <span className="relative block h-px flex-1 bg-bone-white/15">
            <span
              ref={progressRef}
              className={`${styles.progressFill} absolute inset-0 block bg-blood-accent`}
            />
          </span>
        </div>
      </div>
    </section>
  );
}
