"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { COLOR, EASE, themeColor } from "@/styles/theme";
import { RACK_COPY, type RackProduct } from "@/data/rack";
import styles from "./Rack.module.css";

/** Rest / swept states of the blade wipe — point counts must match to tween. */
const STILL_ON = "polygon(-60% 0%, 100% 0%, 160% 100%, 0% 100%)";
const STILL_OFF = "polygon(100% 0%, 260% 0%, 320% 100%, 160% 100%)";

const FRAME_IDLE = (el: Element) => themeColor(el, "--c-fg", 0.16);

type Props = {
  product: RackProduct;
  /** Per-column baseline offset — the row is deliberately never level. */
  offsetClass: string;
};

export default function RackCard({ product, offsetClass }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const stillRef = useRef<HTMLDivElement>(null);
  const wornRef = useRef<HTMLDivElement>(null);
  const numeralRef = useRef<HTMLSpanElement>(null);
  const scanRef = useRef<HTMLSpanElement>(null);
  const flashRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const priceRef = useRef<HTMLSpanElement>(null);
  const priceTextRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const frame = frameRef.current;
      const still = stillRef.current;
      const worn = wornRef.current;
      if (!frame || !still || !worn) return;

      const q = gsap.utils.selector(cardRef);
      const brackets = q(".rack-bracket");

      gsap.set(worn, { scale: 1.12 });

      let active = false;
      let swap: gsap.core.Timeline | null = null;

      // Killing a timeline mid-flight would otherwise strand the flash plate or
      // the scan line at whatever opacity they had reached.
      const clearTransients = () =>
        gsap.set([flashRef.current, scanRef.current], { autoAlpha: 0, y: 0 });

      const enter = (reduced: boolean) => {
        if (active) return;
        active = true;
        swap?.kill();
        clearTransients();

        const tl = gsap.timeline();
        swap = tl;

        tl.to(still, { clipPath: STILL_OFF, duration: 0.62, ease: EASE.expo }, 0)
          .to(worn, { scale: 1, duration: 1.15, ease: EASE.expo }, 0)
          .to(numeralRef.current, { autoAlpha: 0.16, y: 0, duration: 0.9, ease: EASE.expo }, 0)
          .to(frame, { borderColor: COLOR.bloodAccent, duration: 0.3 }, 0)
          .to(priceRef.current, { backgroundColor: COLOR.bloodAccent, duration: 0.3 }, 0)
          .to(priceTextRef.current, { color: COLOR.boneWhite, duration: 0.3 }, 0)
          .to(
            statusRef.current,
            {
              duration: 0.45,
              ease: "power2.inOut",
              scrambleText: { text: RACK_COPY.worn, chars: "upperCase", speed: 1 },
            },
            0,
          );

        if (reduced) return;

        // Channel-change jitter: the frame kicks, a blood plate blinks, and a
        // single scan line falls through the swap.
        tl.to(
          frame,
          {
            keyframes: [
              { x: -7, duration: 0.05 },
              { x: 5, duration: 0.05 },
              { x: -2, duration: 0.05 },
              { x: 0, duration: 0.07 },
            ],
            ease: "none",
          },
          0,
        )
          .fromTo(
            flashRef.current,
            { autoAlpha: 0.28 },
            { autoAlpha: 0, duration: 0.34, ease: EASE.inOut },
            0,
          )
          .fromTo(
            scanRef.current,
            { y: 0, autoAlpha: 1 },
            {
              y: () => frame.offsetHeight,
              autoAlpha: 0,
              duration: 0.55,
              ease: "power2.in",
            },
            0,
          )
          .to(
            brackets,
            { autoAlpha: 1, scale: 1, duration: 0.45, ease: EASE.overshoot, stagger: 0.035 },
            0.06,
          );
      };

      const leave = () => {
        if (!active) return;
        active = false;
        swap?.kill();
        clearTransients();

        const tl = gsap.timeline();
        swap = tl;

        tl.to(still, { clipPath: STILL_ON, duration: 0.5, ease: EASE.inOut }, 0)
          .to(worn, { scale: 1.12, duration: 0.7, ease: EASE.inOut }, 0)
          .to(numeralRef.current, { autoAlpha: 0, duration: 0.35, ease: EASE.inOut }, 0)
          .to(frame, { borderColor: FRAME_IDLE(frame), duration: 0.45 }, 0)
          .to(priceRef.current, { backgroundColor: "rgba(0,0,0,0)", duration: 0.35 }, 0)
          .to(priceTextRef.current, { color: COLOR.bloodAccent, duration: 0.35 }, 0)
          .to(brackets, { autoAlpha: 0, scale: 0.55, duration: 0.3, ease: EASE.inOut }, 0)
          .to(
            statusRef.current,
            {
              duration: 0.4,
              ease: "power2.inOut",
              scrambleText: { text: RACK_COPY.still, chars: "upperCase", speed: 1 },
            },
            0,
          );
      };

      const mm = gsap.matchMedia();

      mm.add(
        {
          hoverable: "(hover: hover) and (pointer: fine)",
          // Coarse pointers are included so touch laptops/TVs still get a swap.
          touch: "(hover: none), (pointer: coarse)",
          reduced: "(prefers-reduced-motion: reduce)",
        },
        (self) => {
          const { hoverable, touch, reduced } = self.conditions as Record<string, boolean>;

          if (touch) {
            // No pointer to hold the frame, so the viewport does the holding.
            ScrollTrigger.create({
              id: `rack-swap-${product.id}`,
              trigger: cardRef.current,
              start: "top 62%",
              end: "bottom 38%",
              onEnter: () => enter(reduced),
              onEnterBack: () => enter(reduced),
              onLeave: leave,
              onLeaveBack: leave,
            });
            return;
          }

          if (!hoverable) return;

          const onEnter = () => enter(reduced);
          const onLeave = () => leave();

          frame.addEventListener("pointerenter", onEnter);
          frame.addEventListener("pointerleave", onLeave);

          if (reduced) {
            return () => {
              frame.removeEventListener("pointerenter", onEnter);
              frame.removeEventListener("pointerleave", onLeave);
            };
          }

          // Parallax drift only — no frame rotation.
          const driftX = gsap.quickTo(worn, "x", { duration: 0.8, ease: EASE.expo });
          const driftY = gsap.quickTo(worn, "y", { duration: 0.8, ease: EASE.expo });
          const numX = gsap.quickTo(numeralRef.current, "x", { duration: 1, ease: EASE.expo });

          const onMove = (event: PointerEvent) => {
            const rect = frame.getBoundingClientRect();
            const px = (event.clientX - rect.left) / rect.width - 0.5;
            const py = (event.clientY - rect.top) / rect.height - 0.5;
            driftX(px * -22);
            driftY(py * -16);
            numX(px * 30);
          };

          const onReset = () => {
            driftX(0);
            driftY(0);
            numX(0);
          };

          frame.addEventListener("pointermove", onMove);
          frame.addEventListener("pointerleave", onReset);

          return () => {
            frame.removeEventListener("pointerenter", onEnter);
            frame.removeEventListener("pointerleave", onLeave);
            frame.removeEventListener("pointermove", onMove);
            frame.removeEventListener("pointerleave", onReset);
          };
        },
      );

      // Action buttons fill with a hard wipe rather than a CSS transition.
      const actionCleanups = q(".rack-action").map((button) => {
        const fill = button.querySelector<HTMLElement>(".rack-action-fill");
        const label = button.querySelector<HTMLElement>(".rack-action-label");
        // The solid blood button always carries paper ink, whatever the stock.
        const fixedInk = (button as HTMLElement).dataset.ink === "paper";

        const onOver = () => {
          gsap.to(fill, {
            clipPath: "inset(0 0% 0 0)",
            duration: 0.45,
            ease: EASE.expo,
            overwrite: "auto",
          });
          if (!fixedInk) {
            gsap.to(label, {
              color: themeColor(button, "--c-bg"),
              duration: 0.25,
              overwrite: "auto",
            });
          }
        };
        const onOut = () => {
          gsap.to(fill, {
            clipPath: "inset(0 100% 0 0)",
            duration: 0.35,
            ease: EASE.inOut,
            overwrite: "auto",
          });
          if (!fixedInk) {
            gsap.to(label, {
              color: themeColor(button, "--c-fg"),
              duration: 0.3,
              overwrite: "auto",
            });
          }
        };

        button.addEventListener("pointerenter", onOver);
        button.addEventListener("pointerleave", onOut);
        return () => {
          button.removeEventListener("pointerenter", onOver);
          button.removeEventListener("pointerleave", onOut);
        };
      });

      return () => actionCleanups.forEach((fn) => fn());
    }, cardRef);

    return () => ctx.revert();
  }, [product.id]);

  return (
    <article
      ref={cardRef}
      className={`rack-card relative ${offsetClass}`}
      data-cursor="hover"
    >
      {/* Paper wraps the garment only — the plate is a mount, not a card. */}
      <div className="theme-light bg-black p-3 shadow-print">
        <div
          ref={frameRef}
          className={`${styles.frame} relative aspect-[4/5] overflow-hidden border border-bone-white/15 bg-off-black`}
        >
        {/* Worn shot sits underneath and is oversized so the drift never
            exposes the frame edge. Top-biased crop keeps every model framed
            the same way despite the source files differing in aspect. */}
        <div ref={wornRef} className="absolute -inset-[7%] z-0">
          <Image
            src={product.worn}
            alt={`${product.name} worn`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24vw"
            className="media-product object-cover object-[50%_8%]"
          />
        </div>

        <span
          ref={numeralRef}
          aria-hidden
          className="pointer-events-none absolute -bottom-[8%] left-[-2%] z-[1] font-display text-[9rem] leading-none text-outline-2 opacity-0"
        >
          {product.index}
        </span>

        {/* Solid plate: the cutout PNG must never let the worn shot bleed
            through before the wipe. */}
        <div ref={stillRef} className={`${styles.still} absolute inset-0 z-10 bg-off-black`}>
          <Image
            src={product.still}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24vw"
            className="media-product object-cover"
          />
          {/* Darkroom vignette — burns the studio plate into the frame. */}
          <span aria-hidden className={`${styles.vignette} absolute inset-0`} />
        </div>

        <span
          ref={flashRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 bg-blood-accent opacity-0"
        />
        <span
          ref={scanRef}
          aria-hidden
          className={`${styles.scan} pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-blood-accent opacity-0`}
        />

        <span
          className={`${styles.bracket} rack-bracket absolute left-3 top-3 z-20 h-5 w-5 border-l border-t border-blood-accent`}
        />
        <span
          className={`${styles.bracket} rack-bracket absolute right-3 top-3 z-20 h-5 w-5 border-r border-t border-blood-accent`}
        />
        <span
          className={`${styles.bracket} rack-bracket absolute bottom-3 left-3 z-20 h-5 w-5 border-b border-l border-blood-accent`}
        />
        <span
          className={`${styles.bracket} rack-bracket absolute bottom-3 right-3 z-20 h-5 w-5 border-b border-r border-blood-accent`}
        />

        <span className="absolute left-3 top-3 z-20 font-stencil text-[0.6rem] tracking-stencil text-bone-white/60">
          {product.index}
        </span>
        <span
          ref={statusRef}
          className="absolute bottom-3 left-3 z-20 bg-black/70 px-2 py-1 font-stencil text-[0.6rem] tracking-stencil text-bone-white"
        >
          {RACK_COPY.still}
        </span>
        </div>
      </div>

      {/* Meta sits off the plate, on the dark field, in bone and blood only. */}
      <div className="mt-5">
        <div className="flex items-baseline gap-3">
          <span className="h-px w-5 shrink-0 bg-blood-accent" />
          <h3 className="font-display text-[clamp(1.1rem,1.6vw,1.5rem)] leading-none tracking-crushed text-bone-white">
            {product.name}
          </h3>
        </div>
        <p className="mt-2 pl-8 font-stencil text-[0.58rem] tracking-stencil text-blood-accent/85">
          {product.spec}
        </p>
        <p className="mt-3 pl-8 font-body text-[0.9rem] leading-snug text-bone-white/60">
          {product.line}
        </p>
      </div>

      <div className="hairline mt-4" />

      <div className="mt-4">
        <span ref={priceRef} className="inline-block border border-blood-accent px-3 py-2">
          <span
            ref={priceTextRef}
            className="block font-body text-[1rem] font-semibold leading-none text-blood-accent"
          >
            {product.price}
          </span>
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 xl:grid-cols-2">
        <button
          type="button"
          className="rack-action clip-cut relative overflow-hidden border border-bone-white/30 py-3"
        >
          <span
            aria-hidden
            className={`${styles.actionFill} rack-action-fill absolute inset-0 bg-bone-white`}
          />
          <span className="rack-action-label relative block font-stencil text-[0.55rem] tracking-[0.16em] text-bone-white">
            {RACK_COPY.addToCart}
          </span>
        </button>

        <button
          type="button"
          data-ink="paper"
          className="rack-action clip-cut relative overflow-hidden border border-blood-accent bg-blood-accent py-3"
        >
          <span
            aria-hidden
            className={`${styles.actionFill} rack-action-fill absolute inset-0 bg-ink`}
          />
          <span className="rack-action-label relative block font-stencil text-[0.55rem] tracking-[0.16em] text-paper">
            {RACK_COPY.buyNow}
          </span>
        </button>
      </div>
    </article>
  );
}
