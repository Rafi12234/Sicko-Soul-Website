"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { SEGMENTS, SEGMENTS_COPY } from "@/data/segments";
import styles from "./Segments.module.css";

export default function Segments() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const numeralRef = useRef<HTMLSpanElement>(null);
  const specRef = useRef<HTMLSpanElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const layers = q(".segment-layer");
      const fills = q(".segment-fill");
      const rules = q(".segment-rule");
      const indices = q(".segment-index");
      const names = q(".segment-name");

      let current = -1;
      let scrollIndex = 0;

      // Writes state for every row on each call, never just the outgoing one.
      // Reverting only `prev` stranded rows armed whenever state desynced
      // (rapid hover, breakpoint switch, hot reload).
      const activate = (next: number) => {
        if (next === current || !layers[next]) return;
        current = next;

        SEGMENTS.forEach((_, i) => {
          const on = i === next;

          gsap.to(fills[i], {
            clipPath: on ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)",
            duration: on ? 0.75 : 0.5,
            ease: on ? EASE.expo : EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(rules[i], {
            scaleX: on ? 1 : 0,
            duration: on ? 0.8 : 0.4,
            ease: on ? EASE.expo : EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(indices[i], {
            color: on ? COLOR.bloodAccent : COLOR.concreteGray,
            duration: 0.3,
            overwrite: "auto",
          });
          gsap.to(names[i], {
            x: on ? 22 : 0,
            duration: on ? 0.7 : 0.5,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(layers[i], {
            clipPath: on ? "inset(0% 0 0% 0)" : "inset(0 0 100% 0)",
            duration: on ? 0.85 : 0.6,
            ease: on ? EASE.expo : EASE.inOut,
            overwrite: "auto",
          });
        });

        gsap.fromTo(
          layers[next].querySelector("img"),
          { scale: 1.18 },
          { scale: 1, duration: 1.1, ease: EASE.expo, overwrite: "auto" },
        );

        const segment = SEGMENTS[next];

        gsap.to(numeralRef.current, {
          duration: 0.5,
          ease: "power2.inOut",
          scrambleText: { text: segment.index, chars: "0123456789", speed: 1 },
          overwrite: "auto",
        });
        gsap.to(specRef.current, {
          duration: 0.55,
          ease: "power2.inOut",
          scrambleText: { text: segment.spec, chars: "upperCase", speed: 0.9 },
          overwrite: "auto",
        });
        if (lineRef.current) lineRef.current.textContent = segment.line;
        gsap.fromTo(
          lineRef.current,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.6, ease: EASE.hard, overwrite: "auto" },
        );

        gsap.to(progressRef.current, {
          scaleY: (next + 1) / SEGMENTS.length,
          duration: 0.6,
          ease: EASE.expo,
          overwrite: "auto",
        });
      };

      /* ---- Heading reveal, independent of the pin. ---- */
      const headingSplit = new SplitText(".segments-heading", { type: "chars" });
      gsap.from(headingSplit.chars, {
        yPercent: 110,
        autoAlpha: 0,
        rotate: 4,
        duration: 1,
        stagger: STAGGER.chars,
        ease: EASE.expo,
        scrollTrigger: {
          id: "segments-heading",
          trigger: rootRef.current,
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        // Breakpoint switches re-run this; without the reset activate() would
        // early-return and leave the previous branch's state on screen.
        current = -1;
        activate(0);

        ScrollTrigger.create({
          id: "segments-pin",
          trigger: rootRef.current,
          start: "top top",
          end: () => `+=${window.innerHeight * SEGMENTS.length * 0.85}`,
          pin: pinRef.current,
          anticipatePin: 1,
          onUpdate: (self) => {
            const idx = Math.min(
              SEGMENTS.length - 1,
              Math.floor(self.progress * SEGMENTS.length),
            );
            scrollIndex = idx;
            activate(idx);
          },
        });

        // Pointer arms a row on enter; leaving the list hands control back to
        // whatever the scroll position says, so nothing stays armed after the
        // cursor leaves.
        const cleanups = names.map((name, i) => {
          const onEnter = () => activate(i);
          name.addEventListener("pointerenter", onEnter);
          return () => name.removeEventListener("pointerenter", onEnter);
        });

        const list = rootRef.current?.querySelector(".segment-list");
        const onListLeave = () => activate(scrollIndex);
        list?.addEventListener("pointerleave", onListLeave);

        return () => {
          cleanups.forEach((fn) => fn());
          list?.removeEventListener("pointerleave", onListLeave);
        };
      });

      mm.add("(max-width: 1023px)", () => {
        current = -1;
        activate(0);

        // No pin below lg: whichever row holds the viewport arms itself, so the
        // one-at-a-time rule still holds without a pointer.
        const rows = q(".segment-row");
        rows.forEach((row, i) => {
          ScrollTrigger.create({
            id: `segments-row-${i}`,
            trigger: row,
            start: "top 65%",
            end: "bottom 35%",
            onEnter: () => activate(i),
            onEnterBack: () => activate(i),
          });
        });

        ScrollTrigger.batch(rows, {
          start: "top 85%",
          onEnter: (batch) =>
            gsap.from(batch, {
              autoAlpha: 0,
              yPercent: 18,
              duration: 0.9,
              stagger: STAGGER.lines,
              ease: EASE.expo,
            }),
        });
      });

      return () => headingSplit.revert();
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={rootRef} id="segments" className="relative bg-black">
      <div ref={pinRef} className="relative overflow-hidden lg:h-screen">
        <div className="relative z-10 flex items-start justify-between px-gutter pt-[7vh]">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-blood-accent" />
              <p className="font-stencil text-stamp text-concrete-gray">{SEGMENTS_COPY.eyebrow}</p>
            </div>
            <p className="mt-3 max-w-[30ch] font-stencil text-stamp text-concrete-gray">
              {SEGMENTS_COPY.aside}
            </p>
          </div>
        </div>

        <h2 className="mt-4 px-gutter">
          <span className="split-mask block pb-[0.08em]">
            <span className="segments-heading text-distress block font-display text-display text-bone-white">
              {SEGMENTS_COPY.heading}
            </span>
          </span>
          <span className="split-mask -mt-[0.12em] block pb-[0.1em] pl-[18%]">
            <span className="segments-heading block font-gothic text-display text-outline">
              {SEGMENTS_COPY.headingAlt}
            </span>
          </span>
        </h2>

        {/* Sits high enough that its top third clears the panel below it. */}
        <span
          ref={numeralRef}
          aria-hidden
          className={`${styles.numeral} pointer-events-none absolute right-[4vw] top-[5vh] z-0 hidden font-display text-[22vw] leading-none text-outline-2 opacity-25 lg:block`}
        >
          01
        </span>

        {/* Panel rides above the row rules so nothing crosses the artwork. */}
        <div className="pointer-events-none absolute right-[7vw] top-1/2 z-20 hidden aspect-[3/4] w-[26vw] -translate-y-1/2 border border-bone-white/20 bg-black lg:block">
          {SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className={`${styles.imageLayer} segment-layer absolute inset-0 overflow-hidden`}
            >
              <Image
                src={segment.image}
                alt={segment.name}
                fill
                sizes="26vw"
                className="media-treat object-cover"
              />
            </div>
          ))}
        </div>

        <div className="segment-list relative mt-[6vh] lg:mt-[3vh]">
          {SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              className="segment-row relative border-t border-bone-white/12 px-gutter py-[1.6vh] lg:py-[0.9vh]"
            >
              <span
                className={`${styles.rowRule} segment-rule absolute inset-x-0 top-0 h-px origin-left bg-blood-accent`}
              />

              <div className="flex items-center gap-6">
                <span className="segment-index font-stencil text-stamp text-concrete-gray">
                  {segment.index}
                </span>

                <span className="segment-name relative block" data-cursor="hover">
                  <span className="block font-display text-segment text-outline-2">
                    {segment.name}
                  </span>
                  {/* Solid duplicate wipes across the hollow letters on activate. */}
                  <span
                    aria-hidden
                    className={`${styles.fill} segment-fill absolute inset-0 block font-display text-segment text-bone-white`}
                  >
                    {segment.name}
                  </span>
                </span>
              </div>

              {/* Below lg the panel is gone, so each row carries its own frame. */}
              <div className="relative mt-4 aspect-[3/4] w-[62%] max-w-xs border border-bone-white/20 lg:hidden">
                <Image
                  src={segment.image}
                  alt={segment.name}
                  fill
                  sizes="62vw"
                  className="media-treat object-cover"
                />
              </div>

              <p className="mt-3 font-stencil text-stamp text-concrete-gray lg:hidden">
                {segment.spec}
              </p>
            </div>
          ))}
          <div className="border-t border-bone-white/12" />
        </div>

        {/* Right padding reserves the panel's x-range (right-7vw, 26vw wide) so
            the quote never sits underneath it, regardless of panel height. */}
        <div className="mt-[3vh] hidden items-end justify-between gap-10 px-gutter pb-[5vh] lg:flex lg:pr-[35vw]">
          <div className="flex items-center gap-5">
            <span className="block h-16 w-px bg-bone-white/20">
              <span
                ref={progressRef}
                className="block h-full w-full origin-top scale-y-0 bg-blood-accent"
              />
            </span>
            <span ref={specRef} className="font-stencil text-stamp text-bone-white/80">
              {SEGMENTS[0].spec}
            </span>
          </div>

          <p
            ref={lineRef}
            className="max-w-[38ch] text-right font-body text-body-lg text-concrete-gray"
          >
            {SEGMENTS[0].line}
          </p>
        </div>
      </div>
    </section>
  );
}
