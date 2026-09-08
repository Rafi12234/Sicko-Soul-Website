"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { COLOR, EASE, STAGGER } from "@/styles/theme";
import { DROP_COPY, DROP_DRAWERS } from "@/data/drop";
import styles from "./Drop.module.css";

/** Filename carries a space; the encoded form is what the browser must request. */
const DROP_VIDEO = "/vids/new%20drop.mp4";

export default function Drop() {
  const rootRef = useRef<HTMLElement>(null);
  const videoWrapRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const ctxRef = useRef<ReturnType<typeof gsap.context> | null>(null);
  const openRef = useRef<string>(DROP_DRAWERS[0].id);

  const [openId, setOpenId] = useState<string>(DROP_DRAWERS[0].id);

  /** Drives every drawer at once so a rapid click can never strand one open. */
  const applyOpen = (nextId: string, instant = false) => {
    const root = rootRef.current;
    if (!root) return;

    DROP_DRAWERS.forEach((drawer) => {
      const bar = root.querySelector<HTMLElement>(`[data-drawer="${drawer.id}"]`);
      if (!bar) return;

      const body = bar.querySelector<HTMLElement>(".drop-body");
      const inner = bar.querySelector<HTMLElement>(".drop-body-inner");
      const plate = bar.querySelector<HTMLElement>(".drop-window");
      const rule = bar.querySelector<HTMLElement>(".drop-rule");
      const name = bar.querySelector<HTMLElement>(".drop-name");
      const ghost = bar.querySelector<HTMLElement>(".drop-ghost");
      const index = bar.querySelector<HTMLElement>(".drop-index");
      const cards = gsap.utils.toArray<HTMLElement>(".drop-card", bar);
      const on = drawer.id === nextId;
      const duration = instant ? 0 : on ? 0.95 : 0.6;

      gsap.to(body, {
        height: on ? () => inner?.offsetHeight ?? 0 : 0,
        duration,
        ease: on ? EASE.expo : EASE.inOut,
        overwrite: "auto",
      });
      gsap.to(plate, {
        autoAlpha: on ? 1 : 0,
        duration: instant ? 0 : on ? 0.9 : 0.45,
        ease: EASE.expo,
        overwrite: "auto",
      });
      gsap.to(rule, {
        scaleX: on ? 1 : 0,
        duration: instant ? 0 : on ? 0.85 : 0.4,
        ease: on ? EASE.expo : EASE.inOut,
        overwrite: "auto",
      });
      gsap.to(name, {
        x: on ? 26 : 0,
        color: on ? COLOR.boneWhite : COLOR.concreteGray,
        duration: instant ? 0 : 0.7,
        ease: EASE.expo,
        overwrite: "auto",
      });
      gsap.to(ghost, {
        autoAlpha: on ? 0.16 : 0.05,
        xPercent: on ? 4 : 0,
        duration: instant ? 0 : 1,
        ease: EASE.expo,
        overwrite: "auto",
      });
      gsap.to(index, {
        color: on ? COLOR.bloodAccent : COLOR.concreteGray,
        duration: instant ? 0 : 0.35,
        overwrite: "auto",
      });

      if (on && !instant && cards.length) {
        // Pieces are thrown in from the right as the drawer clears them.
        gsap.fromTo(
          cards,
          { xPercent: 26, autoAlpha: 0, rotate: 2.5 },
          {
            xPercent: 0,
            autoAlpha: 1,
            rotate: 0,
            duration: 0.9,
            stagger: STAGGER.images,
            ease: EASE.expo,
            overwrite: true,
            delay: 0.16,
          },
        );
      } else if (on && instant) {
        gsap.set(cards, { xPercent: 0, autoAlpha: 1, rotate: 0 });
      }
    });
  };

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(rootRef);
      const mm = gsap.matchMedia();

      applyOpen(openRef.current, true);

      /* ---- Masthead. ---- */
      const headingSplit = new SplitText(".drop-heading", { type: "chars" });
      const intro = gsap.timeline({
        scrollTrigger: {
          id: "drop-intro",
          trigger: rootRef.current,
          start: "top 68%",
          toggleActions: "play none none reverse",
        },
      });

      intro
        .from(headingSplit.chars, {
          yPercent: 118,
          autoAlpha: 0,
          rotate: -6,
          duration: 1.05,
          stagger: STAGGER.chars,
          ease: EASE.expo,
        })
        .from(
          ".drop-year",
          { autoAlpha: 0, scale: 1.5, letterSpacing: "0.4em", duration: 1, ease: EASE.expo },
          "-=0.7",
        )
        .from(
          ".drop-masthead-meta",
          { autoAlpha: 0, y: 20, duration: 0.7, stagger: 0.08, ease: EASE.hard },
          "-=0.6",
        );

      /* ---- Bars slide up out of the plate, one after the other. ---- */
      gsap.from(q(".drop-bar"), {
        yPercent: 40,
        autoAlpha: 0,
        duration: 1,
        stagger: 0.12,
        ease: EASE.expo,
        scrollTrigger: {
          id: "drop-bars",
          trigger: ".drop-rack",
          start: "top 84%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---- Plate pushes in slowly for the whole length of the section. ---- */
      mm.add("(min-width: 768px)", () => {
        gsap.fromTo(
          videoWrapRef.current,
          { scale: 1.16, yPercent: -4 },
          {
            scale: 1,
            yPercent: 4,
            ease: "none",
            scrollTrigger: {
              id: "drop-plate",
              trigger: rootRef.current,
              start: "top bottom",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });

      /* ---- Continuous layer, parked until the section is on screen. ---- */
      const loops: gsap.core.Animation[] = [];

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const scan = gsap.fromTo(
          ".drop-scan",
          { yPercent: -100, autoAlpha: 0 },
          {
            yPercent: 4000,
            autoAlpha: 1,
            duration: 4.2,
            ease: "none",
            repeat: -1,
            repeatDelay: 2.6,
          },
        );

        const blink = gsap.to(".drop-live-dot", {
          autoAlpha: 0.15,
          duration: 0.5,
          ease: "power1.inOut",
          repeat: -1,
          yoyo: true,
        });

        // The year never quite settles — the vault is still counting.
        const yearLoop = gsap.timeline({ repeat: -1, repeatDelay: 5 }).to(yearRef.current, {
          duration: 0.9,
          ease: "power2.inOut",
          scrambleText: {
            text: DROP_COPY.year,
            chars: DROP_COPY.yearChars,
            speed: 0.9,
          },
        });

        const statusLoop = gsap.timeline({ repeat: -1, repeatDelay: 6.5 }).to(statusRef.current, {
          duration: 0.7,
          ease: "power2.inOut",
          scrambleText: { text: DROP_COPY.status, chars: "upperCase", speed: 0.8 },
        });

        // Plate stutter: a dropped frame every few seconds, never a smooth fade.
        const glitch = gsap
          .timeline({ repeat: -1, repeatDelay: 4.4 })
          .to(videoWrapRef.current, { x: 9, autoAlpha: 0.55, duration: 0.05, ease: "none" })
          .to(videoWrapRef.current, { x: -7, autoAlpha: 0.9, duration: 0.05, ease: "none" })
          .to(videoWrapRef.current, { x: 0, autoAlpha: 1, duration: 0.08, ease: "none" });

        // Tiles breathe out of phase so the strip never sits perfectly still.
        const tileDrift = gsap.to(".drop-tile-img", {
          scale: 1.06,
          duration: 7,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          stagger: { each: 1.1, from: "random" },
        });

        // One tile at a time drops a frame, like a bad feed cycling cameras.
        const tileFlicker = gsap.to(".drop-tile-index", {
          autoAlpha: 0.25,
          duration: 0.07,
          ease: "none",
          repeat: -1,
          repeatDelay: 3.8,
          yoyo: true,
          stagger: { each: 0.45, from: "random" },
        });

        loops.push(scan, blink, yearLoop, statusLoop, glitch, tileDrift, tileFlicker);
      });

      loops.forEach((loop) => loop.pause());
      ScrollTrigger.create({
        id: "drop-loops",
        trigger: rootRef.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => loops.forEach((loop) => (self.isActive ? loop.play() : loop.pause())),
      });

      /* ---- Closed bars preview the plate on hover. ---- */
      const barCleanups = q(".drop-bar").map((bar) => {
        const id = bar.dataset.drawer;
        const preview = bar.querySelector<HTMLElement>(".drop-window");
        const name = bar.querySelector<HTMLElement>(".drop-name");

        const onOver = () => {
          if (id === openRef.current) return;
          gsap.to(preview, { autoAlpha: 0.32, duration: 0.5, ease: EASE.expo, overwrite: "auto" });
          gsap.to(name, { x: 14, color: COLOR.boneWhite, duration: 0.5, ease: EASE.expo, overwrite: "auto" });
        };
        const onOut = () => {
          if (id === openRef.current) return;
          gsap.to(preview, { autoAlpha: 0, duration: 0.4, ease: EASE.inOut, overwrite: "auto" });
          gsap.to(name, { x: 0, color: COLOR.concreteGray, duration: 0.45, ease: EASE.inOut, overwrite: "auto" });
        };

        bar.addEventListener("pointerenter", onOver);
        bar.addEventListener("pointerleave", onOut);
        return () => {
          bar.removeEventListener("pointerenter", onOver);
          bar.removeEventListener("pointerleave", onOut);
        };
      });

      const onResize = () => applyOpen(openRef.current, true);
      window.addEventListener("resize", onResize);

      /* ---- Piece tiles: blood flash, torn bands, chip drop, name scramble. */
      const tileCleanups = q(".drop-tile").map((tile) => {
        const plate = tile.querySelector<HTMLElement>(".drop-tile-img");
        const wash = tile.querySelector<HTMLElement>(".drop-tile-wash");
        const slices = gsap.utils.toArray<HTMLElement>(".drop-tile-slice", tile);
        const chip = tile.querySelector<HTMLElement>(".drop-tile-chip");
        const rule = tile.querySelector<HTMLElement>(".drop-tile-rule");
        const name = tile.querySelector<HTMLElement>(".drop-tile-name");
        const ghost = tile.querySelector<HTMLElement>(".drop-tile-ghost");
        const index = tile.querySelector<HTMLElement>(".drop-tile-index");
        const label = tile.dataset.name ?? "";
        let hover: gsap.core.Timeline | null = null;

        const onOver = () => {
          hover?.kill();
          gsap.set(slices, { autoAlpha: 0, x: 0 });

          hover = gsap.timeline();
          hover
            .to(tile, { y: -10, borderColor: COLOR.bloodAccent, duration: 0.5, ease: EASE.expo }, 0)
            .to(plate, { scale: 1.09, duration: 1.1, ease: EASE.expo }, 0)
            // Two bands tear across, then the frame settles.
            .to(slices, { autoAlpha: 1, x: -22, duration: 0.05, ease: "none", stagger: 0.03 }, 0)
            .to(slices, { x: 17, duration: 0.05, ease: "none", stagger: 0.03 }, 0.07)
            .to(slices, { x: 0, autoAlpha: 0, duration: 0.09, ease: "none" }, 0.15)
            .fromTo(wash, { autoAlpha: 0.5 }, { autoAlpha: 0, duration: 0.5, ease: EASE.inOut }, 0)
            .to(chip, { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: EASE.overshoot }, 0.08)
            .to(rule, { scaleX: 1, duration: 0.6, ease: EASE.expo }, 0.05)
            .to(ghost, { autoAlpha: 0.3, x: 14, duration: 0.8, ease: EASE.expo }, 0)
            .to(index, { rotate: -8, scale: 1.15, duration: 0.5, ease: EASE.overshoot }, 0)
            .to(
              name,
              {
                duration: 0.5,
                ease: "power2.inOut",
                scrambleText: { text: label, chars: "upperCase", speed: 1 },
              },
              0,
            );
        };

        const onOut = () => {
          hover?.kill();
          gsap.set(slices, { autoAlpha: 0, x: 0 });

          hover = gsap.timeline();
          hover
            .to(
              tile,
              {
                y: 0,
                borderColor: "rgba(242,240,235,0.15)",
                duration: 0.55,
                ease: EASE.inOut,
              },
              0,
            )
            .to(plate, { scale: 1, duration: 0.7, ease: EASE.inOut }, 0)
            .to(wash, { autoAlpha: 0, duration: 0.3 }, 0)
            .to(chip, { yPercent: -140, autoAlpha: 0, duration: 0.35, ease: EASE.inOut }, 0)
            .to(rule, { scaleX: 0, duration: 0.35, ease: EASE.inOut }, 0)
            .to(ghost, { autoAlpha: 0.13, x: 0, duration: 0.6, ease: EASE.inOut }, 0)
            .to(index, { rotate: 0, scale: 1, duration: 0.4, ease: EASE.inOut }, 0);
        };

        tile.addEventListener("pointerenter", onOver);
        tile.addEventListener("pointerleave", onOut);
        return () => {
          tile.removeEventListener("pointerenter", onOver);
          tile.removeEventListener("pointerleave", onOut);
        };
      });

      /* ---- Way-in tile: floods blood from the floor up. ---- */
      const enterCleanups = q(".drop-enter").map((tile) => {
        const fill = tile.querySelector<HTMLElement>(".drop-enter-fill");
        const ink = gsap.utils.toArray<HTMLElement>(".drop-enter-ink", tile);
        const arrow = tile.querySelector<HTMLElement>(".drop-enter-arrow");

        const onOver = () => {
          gsap.to(fill, {
            clipPath: "inset(0% 0 0 0)",
            duration: 0.55,
            ease: EASE.expo,
            overwrite: "auto",
          });
          gsap.to(ink, { color: COLOR.black, duration: 0.3, overwrite: "auto" });
          gsap.to(arrow, {
            x: 10,
            color: COLOR.black,
            duration: 0.5,
            ease: EASE.expo,
            overwrite: "auto",
          });
        };
        const onOut = () => {
          gsap.to(fill, {
            clipPath: "inset(100% 0 0 0)",
            duration: 0.4,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          gsap.to(ink, { color: COLOR.boneWhite, duration: 0.35, overwrite: "auto" });
          gsap.to(arrow, {
            x: 0,
            color: COLOR.bloodAccent,
            duration: 0.4,
            ease: EASE.inOut,
            overwrite: "auto",
          });
        };

        tile.addEventListener("pointerenter", onOver);
        tile.addEventListener("pointerleave", onOut);
        return () => {
          tile.removeEventListener("pointerenter", onOver);
          tile.removeEventListener("pointerleave", onOut);
        };
      });

      return () => {
        headingSplit.revert();
        barCleanups.forEach((fn) => fn());
        tileCleanups.forEach((fn) => fn());
        enterCleanups.forEach((fn) => fn());
        window.removeEventListener("resize", onResize);
      };
    }, rootRef);

    ctxRef.current = ctx;
    return () => {
      ctxRef.current = null;
      ctx.revert();
    };
  }, []);

  const handleToggle = (id: string) => {
    if (id === openRef.current) return;
    openRef.current = id;
    setOpenId(id);
    ctxRef.current?.add(() => {
      applyOpen(id);
      ScrollTrigger.refresh();
    });
  };

  return (
    <section ref={rootRef} id="drop" className="relative overflow-hidden bg-black pb-[14vh] pt-[13vh]">
      {/* Plate sits behind everything and is only uncovered by an open drawer. */}
      <div ref={videoWrapRef} className="pointer-events-none absolute inset-0 z-0">
        <video
          className="media-treat h-full w-full object-cover opacity-[0.22]"
          src={DROP_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
      <div className={`${styles.vignette} pointer-events-none absolute inset-0 z-0`} />
      <div className={`${styles.scanlines} pointer-events-none absolute inset-0 z-0 opacity-40`} />

      <span
        aria-hidden
        className={`${styles.edge} pointer-events-none absolute left-2 top-[30vh] z-10 hidden font-stencil text-[0.6rem] tracking-stencil text-concrete-gray/60 xl:block`}
      >
        {DROP_COPY.aside}
      </span>

      <div className="relative z-10 px-gutter">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
          <div className="drop-masthead-meta flex items-center gap-4">
            <span className="drop-live-dot block h-[7px] w-[7px] bg-blood-accent" />
            <span className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
              {DROP_COPY.live}
            </span>
            <span className="h-px w-10 bg-blood-accent/60" />
            <span className="font-stencil text-stamp text-concrete-gray">{DROP_COPY.eyebrow}</span>
          </div>
          <span className="drop-masthead-meta border border-bone-white/25 px-3 py-2 font-stencil text-[0.55rem] tracking-stencil text-bone-white">
            {DROP_COPY.stamp}
          </span>
        </div>

        {/* Display word and blackletter year share a baseline and overlap. */}
        <div className="relative mt-[5vh] flex flex-wrap items-end gap-x-6">
          <h2 className="split-mask block pb-[0.08em]">
            <span className="drop-heading text-distress block font-display text-display-xl leading-[0.82] text-bone-white">
              {DROP_COPY.heading}
            </span>
          </h2>
          <span
            ref={yearRef}
            className="drop-year -ml-2 block font-blackletter text-[clamp(2.5rem,7vw,6rem)] leading-[0.9] text-outline-blood sm:-ml-6"
          >
            {DROP_COPY.year}
          </span>
        </div>

        <div className="drop-masthead-meta mt-5 flex items-center gap-4">
          <span ref={statusRef} className="font-stencil text-[0.55rem] tracking-stencil text-bone-white/70">
            {DROP_COPY.status}
          </span>
          <span className="h-px flex-1 bg-bone-white/12" />
          <span className="font-stencil text-[0.55rem] tracking-stencil text-concrete-gray">
            {DROP_COPY.hint}
          </span>
        </div>
      </div>

      {/* ── Drawers ──────────────────────────────────────────────────── */}
      <div className="drop-rack relative z-10 mt-[6vh]">
        {DROP_DRAWERS.map((drawer) => {
          const isOpen = drawer.id === openId;

          return (
            <div
              key={drawer.id}
              data-drawer={drawer.id}
              className={`${styles.bar} drop-bar relative border-t border-bone-white/12 last:border-b`}
            >
              {/* Cut-out window onto the plate, opened only by this drawer. */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`${styles.window} drop-window absolute inset-0 opacity-0`}>
                  <video
                    className="media-treat h-full w-full object-cover opacity-60"
                    src={DROP_VIDEO}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    aria-hidden
                  />
                  <span className="absolute inset-0 bg-black/45" />
                  <span
                    aria-hidden
                    className={`${styles.scan} drop-scan absolute inset-x-0 top-0 h-px bg-blood-accent/70 opacity-0`}
                  />
                </div>
              </div>

              <span
                className={`${styles.rule} drop-rule absolute inset-x-0 top-0 z-10 h-px origin-left bg-blood-accent`}
              />

              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => handleToggle(drawer.id)}
                className="relative z-10 flex w-full items-center gap-5 px-gutter py-[3.2vh] text-left sm:gap-8"
              >
                <span className="drop-index shrink-0 font-stencil text-[0.6rem] tracking-stencil text-concrete-gray">
                  {drawer.index}
                </span>

                <span className="relative block min-w-0 flex-1">
                  {/* Hollow oversized echo behind the live name. */}
                  <span
                    aria-hidden
                    className="drop-ghost pointer-events-none absolute -top-[0.42em] left-0 block whitespace-nowrap font-display text-[clamp(3rem,9vw,7.5rem)] leading-none text-outline-2 opacity-5"
                  >
                    {drawer.ghost}
                  </span>
                  <span className="drop-name relative block whitespace-nowrap font-display text-segment tracking-crushed text-concrete-gray">
                    {drawer.name}
                  </span>
                </span>

                <span className="hidden shrink-0 font-stencil text-[0.55rem] tracking-stencil text-concrete-gray md:block">
                  {drawer.count}
                </span>
                <span className="shrink-0 font-stencil text-[0.6rem] tracking-stencil text-blood-accent">
                  {isOpen ? "—" : "+"}
                </span>
              </button>

              <div className={`${styles.body} drop-body relative z-10`}>
                <div className="drop-body-inner px-gutter pb-[5vh]">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 pb-6">
                    <span className="h-px w-8 bg-blood-accent" />
                    <p className="font-stencil text-[0.55rem] tracking-stencil text-bone-white/70">
                      {drawer.line}
                    </p>
                    <span className="ml-auto font-stencil text-[0.52rem] tracking-stencil text-concrete-gray">
                      {`${DROP_COPY.catalogue.showing} ${String(
                        Math.min(DROP_COPY.previewCount, drawer.pieces.length),
                      ).padStart(2, "0")} ${DROP_COPY.catalogue.of} ${String(
                        drawer.pieces.length,
                      ).padStart(2, "0")}`}
                    </span>
                  </div>

                  {/* Contact strip, not a catalogue grid: the drawer is a fixed
                      height whatever the run holds, so a big drop never turns
                      this section into a scroll. */}
                  <div className="flex gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:pb-0">
                    {drawer.pieces.slice(0, DROP_COPY.previewCount).map((piece) => (
                      <article
                        key={piece.id}
                        data-piece={piece.id}
                        data-name={piece.name}
                        className={`${styles.card} drop-card drop-tile relative aspect-[4/5] w-[58vw] shrink-0 overflow-hidden border border-bone-white/15 bg-off-black sm:w-[40vw] md:w-auto`}
                        data-cursor="hover"
                      >
                        <div className="drop-tile-img absolute inset-0">
                          <Image
                            src={piece.src}
                            alt={piece.alt}
                            fill
                            sizes="(max-width: 768px) 58vw, 22vw"
                            className="media-product object-cover"
                          />
                        </div>

                        {/* Blood flashes over the piece for a beat on entry. */}
                        <span
                          aria-hidden
                          className={`${styles.wash} drop-tile-wash pointer-events-none absolute inset-0 bg-blood-accent opacity-0`}
                        />

                        {/* Difference-blended bars invert whatever they cross. */}
                        <span
                          aria-hidden
                          className={`${styles.slice} drop-tile-slice pointer-events-none absolute inset-x-0 top-[32%] h-[6%] bg-bone-white opacity-0`}
                        />
                        <span
                          aria-hidden
                          className={`${styles.slice} drop-tile-slice pointer-events-none absolute inset-x-0 top-[63%] h-[3.5%] bg-bone-white opacity-0`}
                        />

                        <span
                          aria-hidden
                          className="drop-tile-ghost pointer-events-none absolute -bottom-[0.16em] -left-[0.05em] z-[1] font-display text-[6.5rem] leading-none text-outline-2 opacity-[0.13]"
                        >
                          {piece.index}
                        </span>

                        <span className="drop-tile-index absolute left-3 top-3 z-10 bg-black/70 px-2 py-1 font-stencil text-[0.52rem] tracking-stencil text-bone-white">
                          {piece.index}
                        </span>

                        {/* Cut-corner chip drops in from above on hover. */}
                        <span
                          aria-hidden
                          className={`${styles.chip} drop-tile-chip clip-cut absolute right-3 top-3 z-10 bg-blood-accent px-2 py-[0.3rem] font-stencil text-[0.45rem] tracking-stencil text-bone-white`}
                        >
                          {DROP_COPY.catalogue.peek}
                        </span>

                        {/* Meta rides on the plate so every tile is one fixed unit. */}
                        <div className={`${styles.tilePlate} absolute inset-x-0 bottom-0 z-10 p-3`}>
                          <span
                            aria-hidden
                            className="drop-tile-rule block h-px w-full origin-left scale-x-0 bg-blood-accent"
                          />
                          <div className="mt-2.5 flex items-baseline justify-between gap-2">
                            <h3 className="drop-tile-name truncate font-display text-[clamp(0.85rem,1.15vw,1.1rem)] leading-none tracking-crushed text-bone-white">
                              {piece.name}
                            </h3>
                            <span className="shrink-0 font-body text-[0.82rem] font-semibold leading-none text-blood-accent">
                              {piece.price}
                            </span>
                          </div>
                          <p className="drop-tile-spec mt-1.5 font-stencil text-[0.48rem] tracking-stencil text-concrete-gray">
                            {piece.spec}
                          </p>
                        </div>
                      </article>
                    ))}

                    {/* Short runs get a plate; everything else gets the way in. */}
                    {drawer.sealed ? (
                      <div
                        className={`${styles.hatch} drop-card flex aspect-[4/5] w-[58vw] shrink-0 flex-col justify-between border border-bone-white/12 bg-black/60 p-5 sm:w-[40vw] md:w-auto`}
                      >
                        <p className="font-stencil text-[0.55rem] tracking-stencil text-blood-accent">
                          {DROP_COPY.sealed.stamp}
                        </p>
                        <p className="max-w-[18ch] font-display text-[clamp(1rem,1.7vw,1.5rem)] uppercase leading-none text-outline-2">
                          {DROP_COPY.sealed.line}
                        </p>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={`${styles.hatch} drop-card drop-enter group relative flex aspect-[4/5] w-[58vw] shrink-0 flex-col justify-between overflow-hidden border border-blood-accent/50 bg-black/70 p-5 text-left sm:w-[40vw] md:w-auto`}
                      >
                        <span
                          aria-hidden
                          className={`${styles.enterFill} drop-enter-fill absolute inset-0 bg-blood-accent`}
                        />

                        <span className="drop-enter-ink relative font-stencil text-[0.52rem] tracking-stencil text-blood-accent">
                          {DROP_COPY.catalogue.stamp}
                        </span>

                        <span className="relative block">
                          <span className="drop-enter-ink block font-display text-[clamp(2.4rem,4.5vw,3.6rem)] leading-none tracking-crushed text-bone-white">
                            {String(drawer.pieces.length).padStart(2, "0")}
                          </span>
                          <span className="drop-enter-ink mt-2 block max-w-[12ch] font-stencil text-[0.5rem] leading-relaxed tracking-stencil text-concrete-gray">
                            {DROP_COPY.catalogue.unit}
                          </span>
                        </span>

                        <span className="relative flex items-center gap-3">
                          <span className="drop-enter-ink font-stencil text-[0.52rem] tracking-stencil text-bone-white">
                            {DROP_COPY.catalogue.cta}
                          </span>
                          <span className="drop-enter-arrow font-stencil text-[0.7rem] text-blood-accent">
                            →
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
