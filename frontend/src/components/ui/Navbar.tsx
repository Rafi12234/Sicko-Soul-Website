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
  const logoRef = useRef<HTMLAnchorElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const menuDockRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const skipFocusOpenRef = useRef(false);

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
    const cleanups: Array<() => void> = [];

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

      const logo = logoRef.current;
      const ghost = ghostRef.current;
      if (logo && ghost) {
        const glitch = gsap.timeline({ paused: true, repeat: -1 })
          .to(ghost, { autoAlpha: 0.85, duration: 0.05, ease: EASE.hard })
          .to(ghost, { x: -4, y: 1, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: 5, y: -2, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: -2, y: 2, duration: 0.06, ease: EASE.hard })
          .to(ghost, { x: 3, y: 0, duration: 0.06, ease: EASE.hard });
        const onEnter = () => glitch.play(0);
        const onLeave = () => {
          glitch.pause(0);
          gsap.to(ghost, {
            autoAlpha: 0,
            x: 0,
            y: 0,
            overwrite: true,
            duration: 0.25,
            ease: EASE.expo,
          });
        };
        logo.addEventListener("pointerenter", onEnter);
        logo.addEventListener("pointerleave", onLeave);
        cleanups.push(() => {
          logo.removeEventListener("pointerenter", onEnter);
          logo.removeEventListener("pointerleave", onLeave);
          glitch.kill();
        });
      }
    }, root);

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      ctx.revert();
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
            ref={logoRef}
            href={pathname === "/" ? "#top" : "/"}
            aria-label="Sicko Soul — home"
            className={`${styles.logo} relative block h-9 w-[136px] overflow-hidden sm:w-[150px]`}
          >
            <Image
              src={MEDIA.images.logo}
              alt="Sicko Soul"
              width={150}
              height={150}
              priority
              className="logo-knockout absolute left-1/2 top-1/2 h-auto w-[136px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[150px]"
            />
            <div ref={ghostRef} aria-hidden className="absolute inset-0 opacity-0">
              <Image
                src={MEDIA.images.logo}
                alt=""
                width={150}
                height={150}
                aria-hidden
                className="logo-knockout absolute left-1/2 top-1/2 h-auto w-[136px] max-w-none -translate-x-1/2 -translate-y-1/2 sm:w-[150px] [filter:sepia(1)_saturate(9)_hue-rotate(-38deg)_brightness(0.75)]"
              />
            </div>
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
                    <span>01—07</span>
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
