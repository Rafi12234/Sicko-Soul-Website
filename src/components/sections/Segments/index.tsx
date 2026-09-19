"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";

import {
  gsap,
  SplitText,
} from "@/lib/gsap";

import {
  COLOR,
  EASE,
  STAGGER,
} from "@/styles/theme";

import {
  SEGMENTS,
  SEGMENTS_COPY,
} from "@/data/segments";

import styles from "./Segments.module.css";

export default function Segments() {
  const rootRef =
    useRef<HTMLElement>(null);

  const numeralRef =
    useRef<HTMLSpanElement>(null);

  const specRef =
    useRef<HTMLSpanElement>(null);

  const lineRef =
    useRef<HTMLParagraphElement>(null);

  const progressRef =
    useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const q =
        gsap.utils.selector(rootRef);

      const layers =
        q(".segment-layer");

      const fills =
        q(".segment-fill");

      const rules =
        q(".segment-rule");

      const indices =
        q(".segment-index");

      const names =
        q(".segment-name");

      const rows =
        q(".segment-row");

      let current = -1;

      /**
       * Activate one category.
       *
       * Important:
       * This is now driven by USER CLICK only.
       *
       * Scrolling no longer changes category.
       */
      const activate = (
        next: number,
      ) => {
        if (
          next === current ||
          !layers[next]
        ) {
          return;
        }

        current = next;

        SEGMENTS.forEach(
          (_, index) => {
            const active =
              index === next;

            /**
             * Active image.
             */
            gsap.to(
              layers[index],
              {
                clipPath: active
                  ? "inset(0% 0 0% 0)"
                  : "inset(0 0 100% 0)",

                duration: active
                  ? 0.85
                  : 0.55,

                ease: active
                  ? EASE.expo
                  : EASE.inOut,

                overwrite: "auto",
              },
            );

            /**
             * Solid text filling the
             * outlined category name.
             */
            gsap.to(
              fills[index],
              {
                clipPath: active
                  ? "inset(0 0% 0 0)"
                  : "inset(0 100% 0 0)",

                duration: active
                  ? 0.75
                  : 0.45,

                ease: active
                  ? EASE.expo
                  : EASE.inOut,

                overwrite: "auto",
              },
            );

            /**
             * Blood-red row rule.
             */
            gsap.to(
              rules[index],
              {
                scaleX: active
                  ? 1
                  : 0,

                duration: active
                  ? 0.8
                  : 0.4,

                ease: active
                  ? EASE.expo
                  : EASE.inOut,

                overwrite: "auto",
              },
            );

            /**
             * Index color.
             */
            gsap.to(
              indices[index],
              {
                color: active
                  ? COLOR.bloodAccent
                  : COLOR.concreteGray,

                duration: 0.3,

                overwrite: "auto",
              },
            );

            /**
             * Small horizontal impact
             * on active title.
             */
            gsap.to(
              names[index],
              {
                x: active
                  ? 22
                  : 0,

                duration: active
                  ? 0.7
                  : 0.5,

                ease: EASE.expo,

                overwrite: "auto",
              },
            );

            /**
             * Accessibility state.
             */
            rows[index]?.setAttribute(
              "aria-pressed",
              active
                ? "true"
                : "false",
            );
          },
        );

        /**
         * Image impact animation.
         */
        const activeImage =
          layers[
            next
          ]?.querySelector(
            "img",
          );

        if (activeImage) {
          gsap.fromTo(
            activeImage,

            {
              scale: 1.16,
            },

            {
              scale: 1,

              duration: 1.05,

              ease: EASE.expo,

              overwrite: "auto",
            },
          );
        }

        const segment =
          SEGMENTS[next];

        /**
         * Giant background number.
         */
        gsap.to(
          numeralRef.current,
          {
            duration: 0.5,

            ease: "power2.inOut",

            scrambleText: {
              text:
                segment.index,

              chars:
                "0123456789",

              speed: 1,
            },

            overwrite: "auto",
          },
        );

        /**
         * Product specification.
         */
        gsap.to(
          specRef.current,
          {
            duration: 0.55,

            ease: "power2.inOut",

            scrambleText: {
              text:
                segment.spec,

              chars:
                "upperCase",

              speed: 0.9,
            },

            overwrite: "auto",
          },
        );

        /**
         * Supporting copy.
         */
        if (
          lineRef.current
        ) {
          lineRef.current.textContent =
            segment.line;
        }

        gsap.fromTo(
          lineRef.current,

          {
            autoAlpha: 0,
            y: 14,
          },

          {
            autoAlpha: 1,
            y: 0,

            duration: 0.6,

            ease: EASE.hard,

            overwrite: "auto",
          },
        );

        /**
         * Small vertical progress line.
         *
         * It now represents selected
         * category, not scroll position.
         */
        gsap.to(
          progressRef.current,
          {
            scaleY:
              (next + 1) /
              SEGMENTS.length,

            duration: 0.6,

            ease: EASE.expo,

            overwrite: "auto",
          },
        );
      };

      /**
       * Heading reveal.
       *
       * This still reacts to scroll,
       * but it does NOT pin the section.
       */
      const headingSplit =
        new SplitText(
          ".segments-heading",
          {
            type: "chars",
          },
        );

      gsap.from(
        headingSplit.chars,
        {
          yPercent: 110,

          autoAlpha: 0,

          rotate: 4,

          duration: 1,

          stagger:
            STAGGER.chars,

          ease: EASE.expo,

          scrollTrigger: {
            id:
              "segments-heading",

            trigger:
              rootRef.current,

            start:
              "top 75%",

            toggleActions:
              "play none none reverse",
          },
        },
      );

      /**
       * Default category.
       *
       * SHIRT is always active first.
       */
      activate(0);

      /**
       * Selection is now CLICK ONLY.
       *
       * Scrolling through this section
       * has absolutely no effect on
       * category selection.
       */
      const cleanups =
        rows.map(
          (
            row,
            index,
          ) => {
            const handleClick =
              () => {
                activate(
                  index,
                );
              };

            row.addEventListener(
              "click",
              handleClick,
            );

            return () => {
              row.removeEventListener(
                "click",
                handleClick,
              );
            };
          },
        );

      /**
       * Mobile/tablet rows can still
       * reveal naturally as they enter.
       *
       * This animation does NOT change
       * the selected product.
       */
      const mm =
        gsap.matchMedia();

      mm.add(
        "(max-width: 1023px)",
        () => {
          gsap.set(
            rows,
            {
              autoAlpha: 1,
              yPercent: 0,
            },
          );

          rows.forEach(
            (row) => {
              gsap.from(
                row,
                {
                  autoAlpha: 0,

                  yPercent: 14,

                  duration: 0.8,

                  ease:
                    EASE.expo,

                  scrollTrigger: {
                    trigger:
                      row,

                    start:
                      "top 92%",

                    once:
                      true,
                  },
                },
              );
            },
          );
        },
      );

      return () => {
        cleanups.forEach(
          (cleanup) =>
            cleanup(),
        );

        headingSplit.revert();
      };
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={rootRef}
      id="segments"
      className="relative bg-black"
    >
      {/*
       * IMPORTANT:
       *
       * No lg:h-screen.
       * No pinned wrapper.
       *
       * The section now occupies only
       * its actual content height and
       * normal page scrolling continues.
       */}
      <div className="relative min-h-screen overflow-hidden">
        {/* TOP COPY */}

        <div className="relative z-10 flex items-start justify-between px-gutter pt-[7vh]">
          <div>
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-blood-accent" />

              <p className="font-stencil text-stamp text-concrete-gray">
                {
                  SEGMENTS_COPY.eyebrow
                }
              </p>
            </div>

            <p className="mt-3 max-w-[30ch] font-stencil text-stamp text-concrete-gray">
              {
                SEGMENTS_COPY.aside
              }
            </p>
          </div>
        </div>

        {/* HEADING */}

        <h2 className="relative mt-4 px-gutter">
          <span className="split-mask block pb-[0.08em]">
            <span className="segments-heading text-distress block font-display text-display text-bone-white">
              {
                SEGMENTS_COPY.heading
              }
            </span>
          </span>

          <span className="split-mask -mt-[0.12em] block pb-[0.1em] pl-[18%]">
            <span className="segments-heading block font-gothic text-display text-outline">
              {
                SEGMENTS_COPY.headingAlt
              }
            </span>
          </span>
        </h2>

        {/* GIANT NUMBER */}

        <span
          ref={
            numeralRef
          }
          aria-hidden
          className={`${styles.numeral} pointer-events-none absolute right-[4vw] top-[5vh] z-0 hidden font-display text-[22vw] leading-none text-outline-2 opacity-25 lg:block`}
        >
          01
        </span>

        {/* DESKTOP IMAGE PANEL */}

        <div className="pointer-events-none absolute right-[7vw] top-1/2 z-20 hidden aspect-[3/4] w-[26vw] -translate-y-1/2 border border-bone-white/20 bg-black lg:block">
          {SEGMENTS.map(
            (
              segment,
            ) => (
              <div
                key={
                  segment.id
                }
                className={`${styles.imageLayer} segment-layer absolute inset-0 overflow-hidden`}
              >
                <Image
                  src={
                    segment.image
                  }
                  alt={
                    segment.name
                  }
                  fill
                  sizes="26vw"
                  className="media-treat object-cover"
                />
              </div>
            ),
          )}
        </div>

        {/* CATEGORY LIST */}

        <div className="segment-list relative mt-[6vh] lg:mt-[3vh]">
          {SEGMENTS.map(
            (
              segment,
            ) => (
              <button
                key={
                  segment.id
                }
                type="button"
                aria-pressed="false"
                className="segment-row group relative block w-full cursor-pointer border-t border-bone-white/12 bg-transparent px-gutter py-[1.6vh] text-left outline-none lg:py-[0.9vh]"
                data-cursor="hover"
              >
                {/* ACTIVE BLOOD RULE */}

                <span
                  className={`${styles.rowRule} segment-rule absolute inset-x-0 top-0 h-px origin-left bg-blood-accent`}
                />

                <div className="flex items-center gap-6">
                  <span className="segment-index font-stencil text-stamp text-concrete-gray">
                    {
                      segment.index
                    }
                  </span>

                  <span className="segment-name relative block">
                    {/* OUTLINE TITLE */}

                    <span className="block font-display text-segment text-outline-2">
                      {
                        segment.name
                      }
                    </span>

                    {/* ACTIVE SOLID TITLE */}

                    <span
                      aria-hidden
                      className={`${styles.fill} segment-fill absolute inset-0 block font-display text-segment text-bone-white`}
                    >
                      {
                        segment.name
                      }
                    </span>
                  </span>
                </div>

                {/*
                 * Mobile image.
                 *
                 * Desktop keeps the shared
                 * image frame on the right.
                 */}
                <div className="relative mt-4 aspect-[3/4] w-[62%] max-w-xs border border-bone-white/20 lg:hidden">
                  <Image
                    src={
                      segment.image
                    }
                    alt={
                      segment.name
                    }
                    fill
                    sizes="62vw"
                    className="media-treat object-cover"
                  />
                </div>

                <p className="mt-3 font-stencil text-stamp text-concrete-gray lg:hidden">
                  {
                    segment.spec
                  }
                </p>
              </button>
            ),
          )}

          <div className="border-t border-bone-white/12" />
        </div>

        {/* DESKTOP DETAIL STRIP */}

        <div className="mt-[3vh] hidden items-end justify-between gap-10 px-gutter pb-[5vh] lg:flex lg:pr-[35vw]">
          <div className="flex items-center gap-5">
            {/* PROGRESS */}

            <span className="block h-16 w-px bg-bone-white/20">
              <span
                ref={
                  progressRef
                }
                className="block h-full w-full origin-top scale-y-0 bg-blood-accent"
              />
            </span>

            {/* SPEC */}

            <span
              ref={
                specRef
              }
              className="font-stencil text-stamp text-bone-white/80"
            >
              {
                SEGMENTS[0]
                  .spec
              }
            </span>
          </div>

          {/* DESCRIPTION */}

          <p
            ref={
              lineRef
            }
            className="max-w-[38ch] text-right font-body text-body-lg text-concrete-gray"
          >
            {
              SEGMENTS[0]
                .line
            }
          </p>
        </div>
      </div>
    </section>
  );
}