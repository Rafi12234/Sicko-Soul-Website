"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FocusEvent, KeyboardEvent, PointerEvent } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { EASE } from "@/styles/theme";
import { useCartStore } from "@/store/useCartStore";
import { MEDIA } from "@/lib/media";
import { NAV_COPY } from "@/data/hero";
import styles from "./Navbar.module.css";

/**
 * The directory is a compact popover attached to MENU, NOT a full-screen overlay.
 * Hover and focus reveal it on desktop. Taps toggle it on touch devices.
 * Opening the directory never pauses Lenis or hides the video below it.
 */
export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const openRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const menuDockRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const skipFocusOpenRef = useRef(false);
  const logoImpactRef = useRef<HTMLSpanElement>(null);
  const lightningRef = useRef<SVGSVGElement>(null);
  const strikeRef = useRef<(() => void) | null>(null);

  const cartCount = useCartStore((state) =>
    state.items.reduce((sum, item) => sum + item.quantity, 0),
  );

  const resolveHref = (href: string) => {
    if (!href.startsWith("#") || pathname === "/") return href;
    return `/${href}`;
  };

  // Close if navigation is changed by the browser or another component.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    openRef.current = menuOpen;
    if (menuOpen && barRef.current) {
      gsap.to(barRef.current, {
        yPercent: 0,
        overwrite: true,
        duration: 0.25,
        ease: EASE.expo,
      });
    }
  }, [menuOpen]);

  // Close on a tap/click anywhere outside the directory (important on mobile).
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: globalThis.PointerEvent) => {
      if (!menuDockRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const bar = barRef.current;
      const plate = plateRef.current;
      if (!bar || !plate) return;

      let hidden = false;
      let plated = false;
      ScrollTrigger.create({
        id: "navbar-scroll-state",
        start: "top -120",
        end: "max",
        onUpdate: (self) => {
          if (openRef.current) {
            hidden = false;
            return;
          }
          const shouldHide = self.direction === 1 && self.scroll() > 240;
          if (shouldHide !== hidden) {
            hidden = shouldHide;
            gsap.to(bar, {
              yPercent: hidden ? -140 : 0,
              overwrite: true,
              duration: 0.45,
              ease: EASE.expo,
            });
          }

          const shouldPlate = self.scroll() > 120;
          if (shouldPlate !== plated) {
            plated = shouldPlate;
            gsap.to(plate, {
              autoAlpha: plated ? 1 : 0,
              overwrite: true,
              duration: 0.35,
              ease: EASE.hard,
            });
          }
        },
      });

      // Logo lightning is an always-on, very small CSS/SVG overlay below.
      // Unlike the previous pointer-triggered GSAP ghost jitter, it requires
      // no JavaScript animation loop or layout updates while scrolling.
    }, root);

    return () => ctx.revert();
  }, []);

  // A real voltage strike: animated bolt propagation, a secondary fork flash,
  // and a sharp, synchronized physical shake of the raster brand mark.
  // Only transforms/opacity/strokes animate; no canvas, looped render or sound.
  useEffect(() => {
    const mark = logoImpactRef.current;
    const svg = lightningRef.current;
    if (!mark || !svg) return;

    const bolts = Array.from(svg.querySelectorAll<SVGGElement>("[data-bolt]"));
    const traces = Array.from(svg.querySelectorAll<SVGPathElement>("path"));
    const flash = mark.querySelector<HTMLElement>("[data-voltage-flash]");
    const bloom = mark.querySelector<HTMLElement>("[data-voltage-bloom]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let active: gsap.core.Timeline | null = null;
    let nextStrike: gsap.core.Tween | null = null;
    let openingStrike: gsap.core.Tween | null = null;

    gsap.set(bolts, { autoAlpha: 0 });
    gsap.set(traces, { strokeDashoffset: 100 });
    gsap.set([flash, bloom], { autoAlpha: 0 });

    const strike = () => {
      if (document.hidden || reduced) return;
      active?.kill();
      // Fully reset a partial strike when hover and the idle charge overlap.
      gsap.set(mark, { x: 0, y: 0, rotation: 0, scale: 1 });
      gsap.set(bolts, { autoAlpha: 0 });
      gsap.set(traces, { strokeDashoffset: 100 });
      gsap.set([flash, bloom], { autoAlpha: 0 });

      active = gsap.timeline({
        onComplete: () => {
          gsap.set(mark, { x: 0, y: 0, rotation: 0, scale: 1 });
          gsap.set(bolts, { autoAlpha: 0 });
          gsap.set([flash, bloom], { autoAlpha: 0 });
        },
      });
      active
        .set(bolts, { autoAlpha: 1 }, 0.018)
        .to(traces, {
          strokeDashoffset: 0,
          duration: 0.15,
          stagger: 0.009,
          ease: "power3.out",
        }, 0.018)
        .to(bloom, { autoAlpha: 0.8, duration: 0.025 }, 0.04)
        .to(flash, { autoAlpha: 0.95, duration: 0.017 }, 0.058)
        .to(mark, { x: -5, y: 2, rotation: -1.8, duration: 0.035, ease: "none" }, 0.045)
        .to(mark, { x: 5, y: -3, rotation: 1.6, duration: 0.035, ease: "none" }, 0.08)
        .to(mark, { x: -3, y: -1, rotation: -0.8, duration: 0.03, ease: "none" }, 0.115)
        .to(mark, { x: 4, y: 2, rotation: 1.1, duration: 0.033, ease: "none" }, 0.145)
        .to(mark, { x: -2, y: 0, rotation: -0.7, duration: 0.035, ease: "none" }, 0.18)
        .to(mark, { x: 0, y: 0, rotation: 0, duration: 0.12, ease: "power3.out" }, 0.215)
        .to(flash, { autoAlpha: 0, duration: 0.04 }, 0.108)
        .to(bolts, { autoAlpha: 0, duration: 0.025 }, 0.225)
        // The return strike flashes back through the already-drawn branches.
        .set(bolts, { autoAlpha: 1 }, 0.29)
        .to(bloom, { autoAlpha: 0.98, duration: 0.025 }, 0.29)
        .to(flash, { autoAlpha: 0.75, duration: 0.016 }, 0.29)
        .to(mark, { x: 2, y: -1, rotation: 0.65, duration: 0.03 }, 0.29)
        .to(mark, { x: -2, y: 1, rotation: -0.55, duration: 0.03 }, 0.32)
        .to(mark, { x: 0, y: 0, rotation: 0, duration: 0.075, ease: "power2.out" }, 0.35)
        .to(bolts, { autoAlpha: 0, duration: 0.08 }, 0.345)
        .to([flash, bloom], { autoAlpha: 0, duration: 0.12 }, 0.345);
    };

    strikeRef.current = strike;
    if (!reduced) {
      // Visible on arrival, then occasional unpredictable discharges.
      openingStrike = gsap.delayedCall(0.85, strike);
      const schedule = () => {
        nextStrike = gsap.delayedCall(gsap.utils.random(4.5, 7), () => {
          strike();
          schedule();
        });
      };
      schedule();
    }

    return () => {
      strikeRef.current = null;
      openingStrike?.kill();
      nextStrike?.kill();
      active?.kill();
      gsap.set(mark, { clearProps: "transform" });
    };
  }, []);

  const supportsHover = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const handlePointerEnter = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      setMenuOpen(true);
    }
  };

  const handlePointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      // Don't hide the focused link from a keyboard user.
      const focused = document.activeElement;
      if (focused && focused !== menuTriggerRef.current &&
          menuDockRef.current?.contains(focused)) return;
      setMenuOpen(false);
    }
  };

  const handleFocus = (_event: FocusEvent<HTMLDivElement>) => {
    // Keyboard users can Tab into the MENU trigger on desktop.
    if (!skipFocusOpenRef.current && supportsHover()) setMenuOpen(true);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setMenuOpen(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      skipFocusOpenRef.current = true;
      menuTriggerRef.current?.focus();
      skipFocusOpenRef.current = false;
      setMenuOpen(false);
    }
  };

  const handleMenuClick = () => {
    // Desktop MENU is hover/focus-only, not a click-to-open page/overlay.
    // Touchscreens have no hover, so allow the same control to be tapped.
    if (!supportsHover()) setMenuOpen((open) => !open);
  };

  return (
    <div ref={rootRef}>
      <header ref={barRef} className={`${styles.bar} fixed inset-x-0 top-0 z-nav`}>
        <div
          ref={plateRef}
          className="pointer-events-none absolute inset-0 border-b border-bone-white/15 bg-black/90 opacity-0"
        />

        <div className="relative flex items-center justify-between px-gutter py-4 sm:py-5">
          <Link
            href={pathname === "/" ? "#top" : "/"}
            aria-label="Sicko Soul — home"
            className={`${styles.logo} relative block h-9 w-[136px] sm:w-[150px]`}
            onPointerEnter={() => strikeRef.current?.()}
            onFocus={() => strikeRef.current?.()}
          >
            {/* The real brand image stays intact. The shock moves the whole
                lockup while its lightning exits beyond the image crop. */}
            <span ref={logoImpactRef} className={styles.logoImpact}>
              <span className={styles.logoCrop} aria-hidden="true">
                <Image
                  src={MEDIA.images.logo}
                  alt=""
                  width={150}
                  height={150}
                  priority
                  className="logo-knockout absolute left-1/2 top-1/2 h-auto w-[136px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[150px]"
                />
              </span>
              <span className={styles.voltageBloom} data-voltage-bloom aria-hidden="true" />
              <span className={styles.voltageFlash} data-voltage-flash aria-hidden="true" />
              <svg
                ref={lightningRef}
                className={styles.lightning}
                viewBox="0 0 220 96"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
                fill="none"
              >
                <g data-bolt className={styles.bolt}>
                  <path className={styles.boltAura} pathLength={100} d="M4 20 L28 30 L22 39 L49 31 L68 52 L81 33 L99 44 L122 19 L138 37 L158 28 L179 35 L216 13" />
                  <path className={styles.boltCore} pathLength={100} d="M4 20 L28 30 L22 39 L49 31 L68 52 L81 33 L99 44 L122 19 L138 37 L158 28 L179 35 L216 13" />
                </g>
                <g data-bolt className={styles.bolt}>
                  <path className={styles.boltAura} pathLength={100} d="M34 0 L47 17 L41 29 L65 39 L62 57 L84 54 L101 90" />
                  <path className={styles.boltCore} pathLength={100} d="M34 0 L47 17 L41 29 L65 39 L62 57 L84 54 L101 90" />
                </g>
                <g data-bolt className={styles.bolt}>
                  <path className={styles.boltAura} pathLength={100} d="M186 3 L175 26 L195 31 L168 51 L178 62 L149 91" />
                  <path className={styles.boltCore} pathLength={100} d="M186 3 L175 26 L195 31 L168 51 L178 62 L149 91" />
                </g>
                <g data-bolt className={styles.bolt}>
                  <path className={styles.boltAura} pathLength={100} d="M5 75 L38 55 L52 66 L80 51 L105 69 L126 46 L148 65 L178 56 L218 78" />
                  <path className={styles.boltCore} pathLength={100} d="M5 75 L38 55 L52 66 L80 51 L105 69 L126 46 L148 65 L178 56 L218 78" />
                </g>
                <g data-bolt className={styles.bolt}>
                  <path className={styles.boltAura} pathLength={100} d="M81 33 L69 17 L86 3 M138 37 L154 48 L164 44 M80 51 L61 83 M178 56 L204 48 L216 57" />
                  <path className={styles.boltCore} pathLength={100} d="M81 33 L69 17 L86 3 M138 37 L154 48 L164 44 M80 51 L61 83 M178 56 L204 48 L216 57" />
                </g>
              </svg>
            </span>
          </Link>

          <div className="relative flex items-center gap-2 sm:gap-3">
            <Link
              href="/cart"
              data-cursor="hover"
              className={`${styles.cartAction} focus-sicko`}
              aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            >
              <span className={styles.cartIcon} aria-hidden>+</span>
              <span className={styles.cartLabel}>CART</span>
              <span className={styles.cartCount}>{String(cartCount).padStart(2, "0")}</span>
            </Link>

            <div
              ref={menuDockRef}
              className={styles.menuDock}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
            >
              <button
                ref={menuTriggerRef}
                type="button"
                onClick={handleMenuClick}
                aria-expanded={menuOpen}
                aria-controls="sicko-site-directory"
                className={`${styles.menuTrigger} focus-sicko`}
              >
                <span className={styles.menuMark} aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
                <span>MENU</span>
                <span className={`${styles.chevron} ${menuOpen ? styles.chevronActive : ""}`} aria-hidden>⌄</span>
              </button>

              <div className={`${styles.dropdownShell} ${menuOpen ? styles.dropdownOpen : ""}`}>
                <nav
                  id="sicko-site-directory"
                  aria-label="Site directory"
                  aria-hidden={!menuOpen}
                  inert={!menuOpen}
                  className={styles.dropdown}
                >

<div className={styles.dropdownHeading}>
  <span>THE DIRECTORY</span>
  <span>
    01—{String(NAV_COPY.links.length).padStart(2, "0")}
  </span>
</div>


                  {NAV_COPY.links.map((link) => (
                    <Link
                      key={link.href}
                      href={resolveHref(link.href)}
                      onClick={() => setMenuOpen(false)}
                      className={`${styles.link} ${link.href === "/cart" ? styles.cartLink : ""}`}
                    >
                      <span className={styles.linkIndex}>{link.index}</span>
                      <span className={styles.linkLabel}>{link.label}</span>
                      <span className={styles.linkArrow} aria-hidden>↗</span>
                    </Link>
                  ))}

                  <p className={styles.dropdownAside}>{NAV_COPY.aside}</p>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
