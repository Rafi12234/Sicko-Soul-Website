"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { useAppStore } from "@/store/useAppStore";
import { getLenis } from "@/hooks/useLenis";
import { NAV_COPY } from "@/data/hero";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const triggerLabelRef = useRef<HTMLSpanElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuTlRef = useRef<gsap.core.Timeline | null>(null);

  const isMenuOpen = useAppStore((state) => state.isMenuOpen);
  const toggleMenu = useAppStore((state) => state.toggleMenu);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const bar = barRef.current;
      const plate = plateRef.current;
      if (!bar || !plate) return;

      /* ---- Hidden-until-earned bar: retreats going down, snaps back going up,
              and inverts to a solid plate once past the hero. ANTI_PATTERNS §1.4 */
      let hidden = false;
      let plated = false;

      ScrollTrigger.create({
        id: "navbar-scroll-state",
        start: "top -120",
        end: "max",
        onUpdate: (self) => {
          if (useAppStore.getState().isMenuOpen) return;

          const shouldHide = self.direction === 1 && self.scroll() > 240;
          if (shouldHide !== hidden) {
            hidden = shouldHide;
            gsap.to(bar, {
              yPercent: hidden ? -140 : 0,
              duration: 0.55,
              ease: EASE.expo,
            });
          }

          const shouldPlate = self.scroll() > 120;
          if (shouldPlate !== plated) {
            plated = shouldPlate;
            gsap.to(plate, { autoAlpha: plated ? 1 : 0, duration: 0.45, ease: EASE.hard });
          }
        },
      });

      /* ---- Logo glitch: bone plate jitters, blood ghost tears away from it. */
      const logo = logoRef.current;
      const ghost = ghostRef.current;
      if (logo && ghost) {
        const glitch = gsap
          .timeline({ paused: true, repeat: -1 })
          .to(ghost, { autoAlpha: 0.85, duration: 0.05, ease: EASE.hard })
          .to(ghost, { x: -4, y: 1, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: 5, y: -2, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: -2, y: 2, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: 3, y: 0, duration: 0.06, ease: EASE.hard });

        const stop = () => {
          glitch.pause(0);
          gsap.to(ghost, { autoAlpha: 0, x: 0, y: 0, duration: 0.25, ease: EASE.expo });
        };

        logo.addEventListener("pointerenter", () => glitch.play(0));
        logo.addEventListener("pointerleave", stop);
      }

      /* ---- Menu plate: built once, scrubbed open/closed by the store effect. */
      const overlay = overlayRef.current;
      if (overlay) {
        const split = new SplitText(".nav-link-label", { type: "chars" });

        menuTlRef.current = gsap
          .timeline({ paused: true })
          .to(overlay, {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 0.85,
            ease: EASE.inOut,
          })
          .from(
            split.chars,
            { yPercent: 130, autoAlpha: 0, stagger: 0.012, duration: 0.75, ease: EASE.expo },
            "-=0.4",
          )
          .from(
            ".nav-link-index",
            { autoAlpha: 0, x: -18, stagger: 0.07, duration: 0.5, ease: EASE.hard },
            "<",
          )
          .from(
            ".nav-link-rule",
            { scaleX: 0, stagger: 0.07, duration: 0.7, ease: EASE.expo },
            "<",
          )
          .from(".nav-aside", { autoAlpha: 0, y: 18, duration: 0.5, ease: EASE.hard }, "<0.2");
      }
    }, rootRef);

    return () => {
      menuTlRef.current = null;
      ctx.revert();
    };
  }, []);

  useLayoutEffect(() => {
    const tl = menuTlRef.current;
    if (!tl) return;

    const ctx = gsap.context(() => {
      if (isMenuOpen) {
        getLenis()?.stop();
        gsap.to(barRef.current, { yPercent: 0, duration: 0.4, ease: EASE.expo });
        tl.timeScale(1).play();
      } else {
        getLenis()?.start();
        tl.timeScale(1.6).reverse();
      }

      gsap.to(triggerLabelRef.current, {
        duration: 0.4,
        ease: "power2.inOut",
        scrambleText: {
          text: isMenuOpen ? NAV_COPY.menuClose : NAV_COPY.menuOpen,
          chars: "upperCase",
          speed: 1,
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, [isMenuOpen]);

  return (
    <div ref={rootRef}>
      <header
        ref={barRef}
        className={`${styles.bar} fixed inset-x-0 top-0 z-nav`}
      >
        <div
          ref={plateRef}
          className="pointer-events-none absolute inset-0 border-b border-bone-white/15 bg-black/90 opacity-0"
        />

        <div className="relative flex items-center justify-between px-gutter py-5">
          <a
            ref={logoRef}
            href="#top"
            aria-label="Sicko Soul — home"
            className={`${styles.logo} relative block h-9 w-[150px] overflow-hidden`}
          >
            <Image
              src="/imgs/logo.jpg"
              alt="Sicko Soul"
              width={150}
              height={150}
              priority
              className="logo-knockout absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2"
            />
            <div ref={ghostRef} aria-hidden className="absolute inset-0 opacity-0">
              <Image
                src="/imgs/logo.jpg"
                alt=""
                width={150}
                height={150}
                aria-hidden
                className="logo-knockout absolute left-1/2 top-1/2 max-w-none -translate-x-1/2 -translate-y-1/2 [filter:sepia(1)_saturate(9)_hue-rotate(-38deg)_brightness(0.75)]"
              />
            </div>
          </a>

          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isMenuOpen}
            className="group flex items-center gap-3 font-stencil text-stamp text-bone-white"
          >
            <span className="h-px w-8 bg-bone-white/50 transition-colors ease-hard group-hover:bg-blood-accent" />
            <span ref={triggerLabelRef} className="min-w-[5ch] text-left">
              {NAV_COPY.menuOpen}
            </span>
          </button>
        </div>
      </header>

      <div
        ref={overlayRef}
        className={`${styles.overlay} fixed inset-0 z-nav bg-black ${
          isMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <nav className="flex h-full flex-col justify-center px-gutter pt-24">
          {NAV_COPY.links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={toggleMenu}
              className={`${styles.link} group relative max-w-3xl py-2`}
            >
              <span className="nav-link-index absolute left-0 top-1/2 -translate-y-1/2 font-stencil text-stamp text-concrete-gray group-hover:text-blood-accent">
                {link.index}
              </span>

              <span className="split-mask pb-[0.14em] pl-14 font-gothic text-nav-link text-bone-white transition-transform duration-500 ease-hard group-hover:translate-x-3">
                <span className="nav-link-label">{link.label}</span>
              </span>

              <span
                className={`${styles.linkRule} nav-link-rule mt-1 block h-px w-full max-w-3xl origin-left bg-bone-white/15`}
              />
            </a>
          ))}

          <p className="nav-aside mt-12 max-w-[34ch] font-stencil text-stamp text-concrete-gray">
            {NAV_COPY.aside}
          </p>
        </nav>
      </div>
    </div>
  );
}
